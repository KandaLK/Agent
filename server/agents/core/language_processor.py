"""
Language Processing Module
Handles language detection, translation, and multi-language support
"""

import asyncio
import json
import re
from typing import Dict, List, Optional, Tuple
from googletrans import Translator
import langdetect
from langdetect.lang_detect_exception import LangDetectException

class LanguageProcessor:
    """
    Handles all language-related processing for the Agentic RAG system
    Supports Sinhala-English translation and language detection
    """
    
    def __init__(self):
        self.translator = Translator()
        
        # Language mappings
        self.supported_languages = {
            'en': 'English',
            'si': 'Sinhala',
            'ta': 'Tamil'  # Future support
        }
        
        # Sinhala Unicode range
        self.sinhala_pattern = re.compile(r'[\u0D80-\u0DFF]')
        
        # Translation cache for common phrases
        self.translation_cache = {}
        
        # Common cloud service terms in Sinhala
        self.cloud_terms_si_en = {
            'ක්ලවුඩ්': 'cloud',
            'සේවාව': 'service',
            'සර්වර්': 'server',
            'ගබඩාව': 'storage',
            'දත්ත': 'data',
            'ගිණුම': 'account',
            'ආරක්ෂාව': 'security',
            'ජාලය': 'network',
            'වින්‍යාසය': 'configuration',
            'ගැටලුව': 'problem',
            'දෝෂය': 'error',
            'උදව්': 'help',
            'සහාය': 'support'
        }

    async def detect_language(self, text: str) -> str:
        """
        Detect the language of input text
        Returns language code (en, si, etc.)
        """
        
        if not text or not text.strip():
            return 'en'  # Default to English
        
        # Quick check for Sinhala characters
        if self.sinhala_pattern.search(text):
            return 'si'
        
        # Use langdetect for other languages
        try:
            detected = langdetect.detect(text)
            
            # Map common detection results
            if detected in self.supported_languages:
                return detected
            else:
                return 'en'  # Default to English for unsupported languages
                
        except LangDetectException:
            # Fallback to English if detection fails
            return 'en'

    async def translate_to_english(self, text: str, source_language: str) -> str:
        """
        Translate text from source language to English
        Optimized for Sinhala to English translation
        """
        
        if source_language == 'en':
            return text
        
        # Check cache first
        cache_key = f"{source_language}:{text[:100]}"  # Use first 100 chars as key
        if cache_key in self.translation_cache:
            return self.translation_cache[cache_key]
        
        try:
            if source_language == 'si':
                # Enhanced Sinhala translation
                translated = await self._translate_sinhala_to_english(text)
            else:
                # Use Google Translate for other languages
                result = self.translator.translate(text, src=source_language, dest='en')
                translated = result.text
            
            # Cache the translation
            self.translation_cache[cache_key] = translated
            
            return translated
            
        except Exception as e:
            print(f"Translation error: {e}")
            return text  # Return original text if translation fails

    async def translate_from_english(self, text: str, target_language: str) -> str:
        """
        Translate text from English to target language
        """
        
        if target_language == 'en':
            return text
        
        # Check cache first
        cache_key = f"en:{target_language}:{text[:100]}"
        if cache_key in self.translation_cache:
            return self.translation_cache[cache_key]
        
        try:
            if target_language == 'si':
                # Enhanced English to Sinhala translation
                translated = await self._translate_english_to_sinhala(text)
            else:
                # Use Google Translate for other languages
                result = self.translator.translate(text, src='en', dest=target_language)
                translated = result.text
            
            # Cache the translation
            self.translation_cache[cache_key] = translated
            
            return translated
            
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    async def _translate_sinhala_to_english(self, text: str) -> str:
        """
        Enhanced Sinhala to English translation with cloud service context
        """
        
        # Pre-process with cloud service terms
        processed_text = text
        for si_term, en_term in self.cloud_terms_si_en.items():
            processed_text = processed_text.replace(si_term, en_term)
        
        # Use Google Translate
        try:
            result = self.translator.translate(processed_text, src='si', dest='en')
            translated = result.text
            
            # Post-process to ensure cloud service context
            translated = await self._enhance_cloud_context(translated)
            
            return translated
            
        except Exception as e:
            print(f"Sinhala translation error: {e}")
            return text

    async def _translate_english_to_sinhala(self, text: str) -> str:
        """
        Enhanced English to Sinhala translation with cloud service context
        """
        
        try:
            # Use Google Translate
            result = self.translator.translate(text, src='en', dest='si')
            translated = result.text
            
            # Post-process with cloud service terms
            for en_term, si_term in {v: k for k, v in self.cloud_terms_si_en.items()}.items():
                translated = translated.replace(en_term, si_term)
            
            return translated
            
        except Exception as e:
            print(f"English to Sinhala translation error: {e}")
            return text

    async def _enhance_cloud_context(self, text: str) -> str:
        """
        Enhance translated text with proper cloud service context
        """
        
        # Common translation improvements for cloud services
        enhancements = {
            'cloud computing': 'cloud services',
            'computer cloud': 'cloud computing',
            'data storage': 'cloud storage',
            'network service': 'cloud network',
            'security service': 'cloud security'
        }
        
        enhanced_text = text.lower()
        for original, enhanced in enhancements.items():
            enhanced_text = enhanced_text.replace(original, enhanced)
        
        return enhanced_text

    def is_mixed_language(self, text: str) -> bool:
        """
        Check if text contains mixed languages (e.g., Sinhala + English)
        """
        
        has_sinhala = bool(self.sinhala_pattern.search(text))
        has_english = bool(re.search(r'[a-zA-Z]', text))
        
        return has_sinhala and has_english

    async def normalize_query(self, text: str, target_language: str = 'en') -> str:
        """
        Normalize query text for consistent processing
        """
        
        # Detect source language
        source_lang = await self.detect_language(text)
        
        # Translate to target language if needed
        if source_lang != target_language:
            normalized = await self.translate_to_english(text, source_lang)
        else:
            normalized = text
        
        # Clean up the text
        normalized = self._clean_text(normalized)
        
        return normalized

    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize text
        """
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove special characters but keep cloud service related ones
        text = re.sub(r'[^\w\s\-\.\@\:]', '', text)
        
        return text

    async def get_language_confidence(self, text: str) -> Dict[str, float]:
        """
        Get confidence scores for language detection
        """
        
        try:
            from langdetect import detect_langs
            
            detections = detect_langs(text)
            confidence_scores = {}
            
            for detection in detections:
                if detection.lang in self.supported_languages:
                    confidence_scores[detection.lang] = detection.prob
            
            # Add Sinhala detection if Unicode characters found
            if self.sinhala_pattern.search(text):
                confidence_scores['si'] = confidence_scores.get('si', 0.0) + 0.3
            
            return confidence_scores
            
        except Exception as e:
            print(f"Language confidence error: {e}")
            return {'en': 1.0}  # Default to English with full confidence

    async def translate_with_context(self, text: str, source_lang: str, 
                                   target_lang: str, context: str = "cloud_services") -> str:
        """
        Translate text with specific context for better accuracy
        """
        
        if source_lang == target_lang:
            return text
        
        # Add context prefix for better translation
        context_prefixes = {
            "cloud_services": "In the context of cloud computing and services: ",
            "troubleshooting": "For technical troubleshooting: ",
            "configuration": "For system configuration: "
        }
        
        prefix = context_prefixes.get(context, "")
        contextual_text = f"{prefix}{text}"
        
        # Translate with context
        if target_lang == 'en':
            translated = await self.translate_to_english(contextual_text, source_lang)
            # Remove the prefix from translation
            if prefix and translated.startswith(prefix):
                translated = translated[len(prefix):].strip()
        else:
            translated = await self.translate_from_english(contextual_text, target_lang)
        
        return translated

    def get_supported_languages(self) -> Dict[str, str]:
        """
        Get list of supported languages
        """
        return self.supported_languages.copy()

    async def batch_translate(self, texts: List[str], source_lang: str, 
                            target_lang: str) -> List[str]:
        """
        Translate multiple texts efficiently
        """
        
        if source_lang == target_lang:
            return texts
        
        translated_texts = []
        
        # Process in batches to avoid API limits
        batch_size = 10
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Translate each text in the batch
            batch_results = []
            for text in batch:
                if target_lang == 'en':
                    translated = await self.translate_to_english(text, source_lang)
                else:
                    translated = await self.translate_from_english(text, target_lang)
                batch_results.append(translated)
            
            translated_texts.extend(batch_results)
            
            # Small delay to respect API limits
            await asyncio.sleep(0.1)
        
        return translated_texts

    def clear_translation_cache(self):
        """
        Clear the translation cache
        """
        self.translation_cache.clear()

    def get_cache_stats(self) -> Dict[str, int]:
        """
        Get translation cache statistics
        """
        return {
            "cache_size": len(self.translation_cache),
            "cache_keys": list(self.translation_cache.keys())[:10]  # First 10 keys
        }