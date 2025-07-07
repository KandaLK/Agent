"""
Domain Relevance Checker
Validates query relevance to cloud services domain and classifies query types
"""

import re
import json
from typing import Dict, List, Tuple, Optional
from enum import Enum
import asyncio
from dataclasses import dataclass

class QueryType(Enum):
    TROUBLESHOOTING = "troubleshooting"
    COMPARISON = "comparison"
    GENERAL_INQUIRY = "general_inquiry"
    CONFIGURATION = "configuration"
    PERFORMANCE = "performance"
    PRICING = "pricing"
    SECURITY = "security"
    MIGRATION = "migration"

@dataclass
class DomainAnalysis:
    relevance_score: float
    confidence: float
    query_type: QueryType
    detected_services: List[str]
    detected_providers: List[str]
    key_concepts: List[str]
    clarification_needed: bool
    suggested_clarifications: List[str]

class DomainRelevanceChecker:
    """
    Analyzes queries to determine relevance to cloud services domain
    and classifies query types for appropriate tool selection
    """
    
    def __init__(self):
        # Cloud service providers
        self.cloud_providers = {
            'aws': ['aws', 'amazon web services', 'amazon', 'ec2', 's3', 'lambda', 'rds', 'cloudfront'],
            'azure': ['azure', 'microsoft azure', 'microsoft', 'vm', 'blob storage', 'functions', 'sql database'],
            'gcp': ['gcp', 'google cloud', 'google', 'compute engine', 'cloud storage', 'cloud functions'],
            'alibaba': ['alibaba cloud', 'aliyun', 'ecs', 'oss'],
            'oracle': ['oracle cloud', 'oci', 'oracle'],
            'ibm': ['ibm cloud', 'watson', 'bluemix']
        }
        
        # Cloud service categories
        self.service_categories = {
            'compute': [
                'ec2', 'virtual machine', 'vm', 'instance', 'server', 'compute engine',
                'container', 'kubernetes', 'docker', 'ecs', 'aks', 'gke', 'fargate'
            ],
            'storage': [
                's3', 'blob storage', 'cloud storage', 'bucket', 'object storage',
                'file storage', 'block storage', 'disk', 'volume', 'backup'
            ],
            'database': [
                'rds', 'sql database', 'nosql', 'dynamodb', 'cosmos db', 'firestore',
                'mysql', 'postgresql', 'mongodb', 'redis', 'database'
            ],
            'networking': [
                'vpc', 'vnet', 'subnet', 'load balancer', 'cdn', 'cloudfront',
                'firewall', 'security group', 'route', 'gateway', 'dns'
            ],
            'security': [
                'iam', 'active directory', 'authentication', 'authorization',
                'encryption', 'ssl', 'certificate', 'key vault', 'secrets'
            ],
            'monitoring': [
                'cloudwatch', 'azure monitor', 'stackdriver', 'logging',
                'metrics', 'alerts', 'monitoring', 'observability'
            ],
            'serverless': [
                'lambda', 'azure functions', 'cloud functions', 'serverless',
                'api gateway', 'event', 'trigger'
            ]
        }
        
        # Query type indicators
        self.query_type_patterns = {
            QueryType.TROUBLESHOOTING: [
                'error', 'issue', 'problem', 'not working', 'failed', 'broken',
                'troubleshoot', 'debug', 'fix', 'resolve', 'help', 'stuck'
            ],
            QueryType.COMPARISON: [
                'vs', 'versus', 'compare', 'comparison', 'difference', 'better',
                'which', 'choose', 'select', 'recommend', 'best'
            ],
            QueryType.CONFIGURATION: [
                'configure', 'setup', 'install', 'deploy', 'create', 'build',
                'how to', 'step by step', 'guide', 'tutorial'
            ],
            QueryType.PERFORMANCE: [
                'performance', 'slow', 'fast', 'optimize', 'speed', 'latency',
                'throughput', 'bottleneck', 'scale', 'scaling'
            ],
            QueryType.PRICING: [
                'cost', 'price', 'pricing', 'billing', 'charge', 'expensive',
                'cheap', 'budget', 'estimate', 'calculator'
            ],
            QueryType.SECURITY: [
                'security', 'secure', 'vulnerability', 'compliance', 'audit',
                'permission', 'access', 'policy', 'encryption'
            ],
            QueryType.MIGRATION: [
                'migrate', 'migration', 'move', 'transfer', 'import', 'export',
                'backup', 'restore', 'sync', 'replicate'
            ]
        }
        
        # Non-cloud indicators (reduce relevance score)
        self.non_cloud_indicators = [
            'local', 'on-premise', 'desktop', 'mobile app', 'game', 'recipe',
            'weather', 'news', 'sports', 'entertainment', 'personal'
        ]

    async def analyze_domain_relevance(self, query: str) -> DomainAnalysis:
        """
        Comprehensive domain relevance analysis
        """
        
        query_lower = query.lower()
        
        # Calculate relevance score
        relevance_score = await self._calculate_relevance_score(query_lower)
        
        # Classify query type
        query_type = await self._classify_query_type(query_lower)
        
        # Detect services and providers
        detected_services = self._detect_services(query_lower)
        detected_providers = self._detect_providers(query_lower)
        
        # Extract key concepts
        key_concepts = self._extract_key_concepts(query_lower)
        
        # Calculate confidence
        confidence = await self._calculate_confidence(query_lower, relevance_score)
        
        # Determine if clarification is needed
        clarification_needed, suggested_clarifications = await self._assess_clarification_needs(
            query_lower, relevance_score, detected_services, detected_providers
        )
        
        return DomainAnalysis(
            relevance_score=relevance_score,
            confidence=confidence,
            query_type=query_type,
            detected_services=detected_services,
            detected_providers=detected_providers,
            key_concepts=key_concepts,
            clarification_needed=clarification_needed,
            suggested_clarifications=suggested_clarifications
        )

    async def _calculate_relevance_score(self, query: str) -> float:
        """
        Calculate domain relevance score (0.0 to 1.0)
        """
        
        score = 0.0
        total_weight = 0.0
        
        # Check for cloud providers (high weight)
        provider_weight = 0.3
        provider_matches = 0
        for provider, terms in self.cloud_providers.items():
            for term in terms:
                if term in query:
                    provider_matches += 1
        
        if provider_matches > 0:
            score += provider_weight * min(1.0, provider_matches / 3)
        total_weight += provider_weight
        
        # Check for service categories (medium weight)
        service_weight = 0.4
        service_matches = 0
        for category, terms in self.service_categories.items():
            for term in terms:
                if term in query:
                    service_matches += 1
        
        if service_matches > 0:
            score += service_weight * min(1.0, service_matches / 5)
        total_weight += service_weight
        
        # Check for cloud-related keywords (low weight)
        cloud_keywords = ['cloud', 'saas', 'paas', 'iaas', 'devops', 'api', 'microservice']
        keyword_weight = 0.2
        keyword_matches = sum(1 for keyword in cloud_keywords if keyword in query)
        
        if keyword_matches > 0:
            score += keyword_weight * min(1.0, keyword_matches / 3)
        total_weight += keyword_weight
        
        # Penalty for non-cloud indicators
        penalty_weight = 0.1
        penalty_matches = sum(1 for indicator in self.non_cloud_indicators if indicator in query)
        
        if penalty_matches > 0:
            score -= penalty_weight * min(1.0, penalty_matches / 2)
        total_weight += penalty_weight
        
        # Normalize score
        if total_weight > 0:
            score = max(0.0, min(1.0, score))
        
        return score

    async def _classify_query_type(self, query: str) -> QueryType:
        """
        Classify the type of query based on patterns
        """
        
        type_scores = {}
        
        for query_type, patterns in self.query_type_patterns.items():
            score = 0
            for pattern in patterns:
                if pattern in query:
                    score += 1
            
            if score > 0:
                type_scores[query_type] = score
        
        if type_scores:
            # Return the type with highest score
            return max(type_scores.items(), key=lambda x: x[1])[0]
        else:
            return QueryType.GENERAL_INQUIRY

    def _detect_services(self, query: str) -> List[str]:
        """
        Detect specific cloud services mentioned in the query
        """
        
        detected = []
        
        for category, terms in self.service_categories.items():
            for term in terms:
                if term in query:
                    detected.append(f"{category}:{term}")
        
        return detected

    def _detect_providers(self, query: str) -> List[str]:
        """
        Detect cloud providers mentioned in the query
        """
        
        detected = []
        
        for provider, terms in self.cloud_providers.items():
            for term in terms:
                if term in query:
                    detected.append(provider)
                    break  # Only add provider once
        
        return detected

    def _extract_key_concepts(self, query: str) -> List[str]:
        """
        Extract key technical concepts from the query
        """
        
        # Technical terms that are important for cloud services
        technical_terms = [
            'api', 'rest', 'json', 'xml', 'http', 'https', 'ssl', 'tls',
            'docker', 'kubernetes', 'container', 'microservice', 'serverless',
            'devops', 'ci/cd', 'pipeline', 'deployment', 'scaling', 'load balancing',
            'database', 'sql', 'nosql', 'cache', 'cdn', 'storage', 'backup',
            'monitoring', 'logging', 'metrics', 'alerts', 'security', 'encryption'
        ]
        
        concepts = []
        for term in technical_terms:
            if term in query:
                concepts.append(term)
        
        return concepts

    async def _calculate_confidence(self, query: str, relevance_score: float) -> float:
        """
        Calculate confidence in the domain analysis
        """
        
        confidence = relevance_score
        
        # Boost confidence for specific service mentions
        specific_services = ['ec2', 's3', 'lambda', 'rds', 'azure vm', 'blob storage']
        for service in specific_services:
            if service in query:
                confidence += 0.1
        
        # Reduce confidence for vague queries
        vague_indicators = ['help', 'question', 'general', 'basic', 'simple']
        for indicator in vague_indicators:
            if indicator in query:
                confidence -= 0.1
        
        return max(0.0, min(1.0, confidence))

    async def _assess_clarification_needs(self, query: str, relevance_score: float,
                                        detected_services: List[str], 
                                        detected_providers: List[str]) -> Tuple[bool, List[str]]:
        """
        Assess if clarification questions are needed
        """
        
        clarifications = []
        
        # Low relevance score indicates need for clarification
        if relevance_score < 0.5:
            clarifications.append("Are you asking about cloud services (AWS, Azure, Google Cloud)?")
        
        # No specific provider detected
        if not detected_providers and relevance_score > 0.3:
            clarifications.append("Which cloud provider are you using (AWS, Azure, Google Cloud)?")
        
        # No specific service detected
        if not detected_services and relevance_score > 0.3:
            clarifications.append("Which specific cloud service are you asking about?")
        
        # Vague troubleshooting query
        if 'error' in query and 'not working' in query and len(query.split()) < 5:
            clarifications.append("What specific error message are you seeing?")
        
        # Multiple providers mentioned
        if len(detected_providers) > 1:
            clarifications.append(f"Are you comparing {' and '.join(detected_providers)} or asking about a specific one?")
        
        needs_clarification = len(clarifications) > 0
        
        return needs_clarification, clarifications

    async def calculate_relevance_score(self, query: str) -> float:
        """
        Public method to get relevance score
        """
        analysis = await self.analyze_domain_relevance(query)
        return analysis.relevance_score

    async def classify_query_type(self, query: str) -> QueryType:
        """
        Public method to get query type
        """
        analysis = await self.analyze_domain_relevance(query)
        return analysis.query_type

    async def calculate_confidence(self, query: str) -> float:
        """
        Public method to get confidence score
        """
        analysis = await self.analyze_domain_relevance(query)
        return analysis.confidence

    def get_domain_keywords(self) -> Dict[str, List[str]]:
        """
        Get all domain keywords for reference
        """
        
        all_keywords = {}
        
        # Add provider keywords
        for provider, terms in self.cloud_providers.items():
            all_keywords[f"provider_{provider}"] = terms
        
        # Add service category keywords
        for category, terms in self.service_categories.items():
            all_keywords[f"service_{category}"] = terms
        
        return all_keywords

    async def validate_query_scope(self, query: str) -> Dict[str, any]:
        """
        Validate if query is within the system's scope
        """
        
        analysis = await self.analyze_domain_relevance(query)
        
        return {
            "in_scope": analysis.relevance_score >= 0.3,
            "confidence": analysis.confidence,
            "query_type": analysis.query_type.value,
            "detected_services": analysis.detected_services,
            "detected_providers": analysis.detected_providers,
            "needs_clarification": analysis.clarification_needed,
            "clarification_questions": analysis.suggested_clarifications
        }