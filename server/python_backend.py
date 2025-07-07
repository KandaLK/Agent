import sys
import json
import random
import os
from typing import Dict, Any, Optional

# Try to import network modules, handle gracefully if they fail
try:
    import urllib.request
    import urllib.parse
    import urllib.error
    NETWORK_AVAILABLE = True
except ImportError as e:
    print(f"Network modules unavailable: {e}", file=sys.stderr)
    NETWORK_AVAILABLE = False

# OpenRouter API Configuration
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', 'your-openrouter-api-key-here')
OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

# Model configurations
MODELS = {
    'en': {
        'model': 'anthropic/claude-3-haiku',  # Fast and efficient for English
        'max_tokens': 1000,
        'temperature': 0.7
    },
    'si': {
        'model': 'meta-llama/llama-3.1-8b-instruct',  # Better multilingual support
        'max_tokens': 1000,
        'temperature': 0.7
    }
}

def call_openrouter_api(user_input: str, language: str = 'en', web_search_enabled: bool = True) -> Dict[str, Any]:
    """
    Call OpenRouter API to get LLM response using urllib
    """
    print(f"🤖 OPENROUTER API CALL:", file=sys.stderr)
    print(f"   Language: {language}", file=sys.stderr)
    print(f"   Web Search: {'Enabled' if web_search_enabled else 'Disabled'}", file=sys.stderr)
    print(f"   Input: \"{user_input[:50]}...\"", file=sys.stderr)
    
    # Check if network modules are available
    if not NETWORK_AVAILABLE:
        print("❌ Network modules not available", file=sys.stderr)
        return {
            'success': False,
            'error': 'Network modules not available in this Python environment',
            'fallback': True
        }
    
    try:
        # Get model configuration for the language
        model_config = MODELS.get(language, MODELS['en'])
        
        # Prepare system prompt based on language and web search
        system_prompts = {
            'en': f"You are a helpful AI assistant. {'You have access to web search capabilities for real-time information.' if web_search_enabled else 'You provide responses based on your training data.'} Provide clear, accurate, and helpful responses to user questions.",
            'si': f"ඔබ ප්‍රයෝජනවත් AI සහායකයෙකි. {'ඔබට තථ්‍ය කාලීන තොරතුරු සඳහා වෙබ් සෙවුම් හැකියාවන් ඇත.' if web_search_enabled else 'ඔබ ඔබේ පුහුණු දත්ත මත පදනම්ව පිළිතුරු සපයයි.'} පරිශීලක ප්‍රශ්නවලට පැහැදිලි, නිවැරදි සහ ප්‍රයෝජනවත් පිළිතුරු ලබා දෙන්න."
        }
        
        # Prepare headers
        headers = {
            'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'ChatBot Application'
        }
        
        # Prepare payload
        payload = {
            'model': model_config['model'],
            'messages': [
                {
                    'role': 'system',
                    'content': system_prompts.get(language, system_prompts['en'])
                },
                {
                    'role': 'user',
                    'content': user_input
                }
            ],
            'max_tokens': model_config['max_tokens'],
            'temperature': model_config['temperature'],
            'stream': False
        }
        
        # Convert payload to JSON bytes
        data = json.dumps(payload).encode('utf-8')
        
        # Create request
        request = urllib.request.Request(
            f'{OPENROUTER_BASE_URL}/chat/completions',
            data=data,
            headers=headers,
            method='POST'
        )
        
        # Make the request with timeout
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status == 200:
                response_data = json.loads(response.read().decode('utf-8'))
                if 'choices' in response_data and len(response_data['choices']) > 0:
                    print("✅ API call successful", file=sys.stderr)
                    return {
                        'success': True,
                        'response': response_data['choices'][0]['message']['content'],
                        'model': model_config['model'],
                        'usage': response_data.get('usage', {}),
                        'language': language,
                        'web_search_enabled': web_search_enabled
                    }
                else:
                    print("❌ No response from model", file=sys.stderr)
                    return {
                        'success': False,
                        'error': 'No response from model',
                        'fallback': True
                    }
            else:
                print(f"❌ API request failed with status {response.status}", file=sys.stderr)
                return {
                    'success': False,
                    'error': f'API request failed with status {response.status}',
                    'fallback': True
                }
            
    except Exception as e:
        print(f"❌ Network request failed: {str(e)}", file=sys.stderr)
        return {
            'success': False,
            'error': f'Network request failed: {str(e)}',
            'fallback': True
        }

def generate_enhanced_fallback_response(user_input: str, language: str = 'en', web_search_enabled: bool = True) -> str:
    """
    Generate enhanced fallback response with basic pattern matching
    """
    print(f"🔄 GENERATING FALLBACK RESPONSE:", file=sys.stderr)
    print(f"   Language: {language}", file=sys.stderr)
    print(f"   Web Search: {'Enabled' if web_search_enabled else 'Disabled'}", file=sys.stderr)
    print(f"   Input: \"{user_input[:50]}...\"", file=sys.stderr)
    
    user_lower = user_input.lower().strip()
    
    # Enhanced pattern-based responses
    patterns = {
        'en': {
            'greeting': {
                'patterns': ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
                'responses': [
                    f"Hello! I'm here to help you with any questions you might have. {'I have web search capabilities for the latest information.' if web_search_enabled else 'I can assist you based on my training data.'}",
                    f"Hi there! How can I assist you today? {'I can search the web for current information if needed.' if web_search_enabled else 'I\'m ready to help with various topics.'}",
                    f"Hey! I'm ready to help with whatever you need. {'With web search enabled, I can provide up-to-date information.' if web_search_enabled else 'I have extensive knowledge to draw from.'}",
                    f"Hello! What would you like to know about today? {'I can access real-time information through web search.' if web_search_enabled else 'I\'m here to share knowledge and insights.'}"
                ]
            },
            'question': {
                'patterns': ['what', 'how', 'why', 'when', 'where', 'who', '?'],
                'responses': [
                    f"That's an interesting question about '{user_input}'. {'While I can search for current information,' if web_search_enabled else 'While I\'m currently running in offline mode,'} I can tell you that this topic often involves multiple perspectives and considerations.",
                    f"You've asked about '{user_input}'. {'With web search capabilities,' if web_search_enabled else 'Even without real-time data,'} this is a topic that many people find fascinating, and there are usually several ways to approach understanding it.",
                    f"Regarding '{user_input}', this is the kind of question that benefits from careful consideration. {'I can search for the latest information' if web_search_enabled else 'I can provide insights based on established knowledge'} to give you a comprehensive answer.",
                    f"Your question about '{user_input}' touches on an important subject. {'With web search enabled, I can find current information' if web_search_enabled else 'Even in offline mode, I can suggest'} that exploring this topic from multiple angles often provides the best insights."
                ]
            },
            'help': {
                'patterns': ['help', 'assist', 'support', 'guide'],
                'responses': [
                    f"I'm here to help! {'With web search capabilities,' if web_search_enabled else 'While I\'m currently in offline mode,'} I can still provide guidance and suggestions on most topics.",
                    f"I'd be happy to assist you! {'Even with internet access,' if web_search_enabled else 'Even without internet access,'} I can offer insights and information on many subjects.",
                    f"I'm ready to support you with your questions. {'My web search capabilities allow me' if web_search_enabled else 'My offline capabilities allow me'} to provide helpful responses on a wide range of topics.",
                    f"Let me help you with that! {'I'm operating with web search enabled,' if web_search_enabled else 'I\'m operating in offline mode,'} but I can still provide useful information and guidance."
                ]
            },
            'thanks': {
                'patterns': ['thank', 'thanks', 'appreciate'],
                'responses': [
                    "You're very welcome! I'm glad I could help.",
                    "Happy to assist! Feel free to ask if you have more questions.",
                    "You're welcome! I'm here whenever you need help.",
                    "My pleasure! Don't hesitate to reach out with more questions."
                ]
            },
            'default': [
                f"I understand you're interested in '{user_input}'. {'With web search capabilities,' if web_search_enabled else 'While I\'m currently in offline mode,'} I find this to be an engaging topic that often has multiple dimensions worth exploring.",
                f"Thank you for bringing up '{user_input}'. {'I can search for current information about this,' if web_search_enabled else 'This is the kind of subject that I enjoy discussing, and even in offline mode,'} I can share that it's often helpful to consider various perspectives on this topic.",
                f"You've mentioned '{user_input}', which is certainly worth thinking about. {'While I have access to web search,' if web_search_enabled else 'While I don\'t have access to real-time information right now,'} I can tell you that topics like this often benefit from careful consideration.",
                f"Regarding '{user_input}', I appreciate you sharing this with me. {'Even with web connectivity,' if web_search_enabled else 'Even without internet connectivity,'} I can suggest that exploring different aspects of this subject often leads to valuable insights.",
                f"I see you're asking about '{user_input}'. This is an interesting area, and {'with web search enabled,' if web_search_enabled else 'while I\'m in offline mode,'} I can share that questions like yours often open up fascinating discussions about the topic."
            ]
        },
        'si': {
            'greeting': {
                'patterns': ['හලෝ', 'ආයුබෝවන්', 'හායි', 'සුභ උදෑසනක්', 'සුභ දවසක්', 'සුභ සන්ධ්‍යාවක්'],
                'responses': [
                    f"ආයුබෝවන්! ඔබට ඇති ඕනෑම ප්‍රශ්නයකට උදව් කිරීමට මම මෙහි සිටිමි. {'මට නවතම තොරතුරු සඳහා වෙබ් සෙවුම් හැකියාවන් ඇත.' if web_search_enabled else 'මට මගේ පුහුණු දත්ත මත පදනම්ව ඔබට උදව් කළ හැකිය.'}",
                    f"හලෝ! අද මට ඔබට කෙසේ උදව් කළ හැකිද? {'අවශ්‍ය නම් මට වර්තමාන තොරතුරු සඳහා වෙබය සෙවිය හැකිය.' if web_search_enabled else 'මම විවිධ විෂයන් සමඟ උදව් කිරීමට සූදානම්.'}",
                    f"හායි! ඔබට අවශ්‍ය ඕනෑම දෙයකට උදව් කිරීමට මම සූදානම්. {'වෙබ් සෙවුම සක්‍රීය කර ඇති අතර, මට යාවත්කාලීන තොරතුරු ලබා දිය හැකිය.' if web_search_enabled else 'මට බෙදා ගැනීමට පුළුල් දැනුමක් ඇත.'}",
                    f"ආයුබෝවන්! අද ඔබ දැන ගැනීමට කැමති කුමක්ද? {'මට වෙබ් සෙවුම හරහා තථ්‍ය කාලීන තොරතුරු වෙත ප්‍රවේශ විය හැකිය.' if web_search_enabled else 'මම දැනුම සහ අවබෝධය බෙදා ගැනීමට මෙහි සිටිමි.'}"
                ]
            },
            'question': {
                'patterns': ['මොකක්ද', 'කොහොමද', 'ඇයි', 'කවදාද', 'කොහේද', 'කවුද', '?'],
                'responses': [
                    f"'{user_input}' ගැන ඔබේ ප්‍රශ්නය සිත්ගන්නා සුළුයි. {'මට වර්තමාන තොරතුරු සෙවිය හැකි අතර,' if web_search_enabled else 'මම දැනට නොබැඳි ප්‍රකාරයේ ක්‍රියාත්මක වන අතර,'} මෙම විෂය බොහෝ විට විවිධ දෘෂ්ටිකෝණ සහ සලකා බැලීම් ඇතුළත් කරයි.",
                    f"ඔබ '{user_input}' ගැන ප්‍රශ්න කර ඇත. {'වෙබ් සෙවුම් හැකියාවන් සමඟ,' if web_search_enabled else 'තථ්‍ය කාලීන දත්ත නොමැතිව වුවද,'} මෙය බොහෝ අය සිත්ගන්නා සුළු විෂයක් වන අතර, එය තේරුම් ගැනීමට සාමාන්‍යයෙන් ක්‍රම කිහිපයක් තිබේ.",
                    f"'{user_input}' සම්බන්ධයෙන්, මෙය ප්‍රවේශමෙන් සලකා බැලීමෙන් ප්‍රයෝජන ලබන ප්‍රශ්න වර්ගයකි. {'මට නවතම තොරතුරු සෙවිය හැකිය' if web_search_enabled else 'මට ස්ථාපිත දැනුම මත පදනම්ව අවබෝධයන් ලබා දිය හැකිය'} ඔබට සවිස්තරාත්මක පිළිතුරක් ලබා දීමට.",
                    f"'{user_input}' ගැන ඔබේ ප්‍රශ්නය වැදගත් විෂයක් ස්පර්ශ කරයි. {'වෙබ් සෙවුම සක්‍රීය කර ඇති අතර, මට වර්තමාන තොරතුරු සොයා ගත හැකිය' if web_search_enabled else 'නොබැඳි ප්‍රකාරයේ වුවද, මට යෝජනා කළ හැකිය'} මෙම විෂය විවිධ කෝණවලින් ගවේෂණය කිරීම බොහෝ විට හොඳම අවබෝධය ලබා දෙන බව."
                ]
            },
            'help': {
                'patterns': ['උදව්', 'සහාය', 'මාර්ගෝපදේශ'],
                'responses': [
                    f"මම උදව් කිරීමට මෙහි සිටිමි! {'වෙබ් සෙවුම් හැකියාවන් සමඟ,' if web_search_enabled else 'මම දැනට නොබැඳි ප්‍රකාරයේ සිටින අතර,'} මට තවමත් බොහෝ විෂයන් පිළිබඳ මාර්ගෝපදේශ සහ යෝජනා ලබා දිය හැකිය.",
                    f"ඔබට උදව් කිරීමට මම සතුටු වෙමි! {'අන්තර්ජාල ප්‍රවේශය සමඟ වුවද,' if web_search_enabled else 'අන්තර්ජාල ප්‍රවේශයක් නොමැතිව වුවද,'} මට බොහෝ විෂයන් පිළිබඳ අවබෝධය සහ තොරතුරු ලබා දිය හැකිය.",
                    f"ඔබේ ප්‍රශ්නවලට සහාය වීමට මම සූදානම්. {'මගේ වෙබ් සෙවුම් හැකියාවන් මට ඉඩ සලසයි' if web_search_enabled else 'මගේ නොබැඳි හැකියාවන් මට ඉඩ සලසයි'} පුළුල් විෂය පරාසයක් පිළිබඳ ප්‍රයෝජනවත් ප්‍රතිචාර ලබා දීමට.",
                    f"ඒ සඳහා මම ඔබට උදව් කරමි! {'මම වෙබ් සෙවුම සක්‍රීය කර ක්‍රියාත්මක වෙමි,' if web_search_enabled else 'මම නොබැඳි ප්‍රකාරයේ ක්‍රියාත්මක වන නමුත්,'} තවමත් ප්‍රයෝජනවත් තොරතුරු සහ මාර්ගෝපදේශ ලබා දිය හැකිය."
                ]
            },
            'thanks': {
                'patterns': ['ස්තූති', 'ස්තුතියි', 'අගය කරනවා'],
                'responses': [
                    "ඔබට ගොඩක් සාදරයෙන්! මට උදව් කිරීමට හැකි වීම ගැන සතුටුයි.",
                    "උදව් කිරීමට සතුටුයි! තවත් ප්‍රශ්න තිබේ නම් නිදහසේ අසන්න.",
                    "ඔබට සාදරයෙන්! ඔබට උදව් අවශ්‍ය වන විට මම මෙහි සිටිමි.",
                    "මගේ සතුටයි! තවත් ප්‍රශ්න සමඟ සම්බන්ධ වීමට පසුබට නොවන්න."
                ]
            },
            'default': [
                f"'{user_input}' ගැන ඔබ උනන්දු වන බව මට තේරෙනවා. {'වෙබ් සෙවුම් හැකියාවන් සමඟ,' if web_search_enabled else 'මම දැනට නොබැඳි ප්‍රකාරයේ සිටින අතර,'} මෙය ගවේෂණය කිරීමට වටින බහුවිධ මානයන් ඇති සිත්ගන්නා සුළු විෂයක් බව මට පෙනේ.",
                f"'{user_input}' ගැන කතා කිරීම ගැන ස්තූතියි. {'මට මේ ගැන වර්තමාන තොරතුරු සෙවිය හැකිය,' if web_search_enabled else 'මෙය මම සාකච්ඡා කිරීමට කැමති විෂය වර්ගයක් වන අතර, නොබැඳි ප්‍රකාරයේ වුවද,'} මෙම විෂය පිළිබඳ විවිධ දෘෂ්ටිකෝණ සලකා බැලීම බොහෝ විට ප්‍රයෝජනවත් බව මට කිව හැකිය.",
                f"ඔබ '{user_input}' ගැන සඳහන් කර ඇත, එය නිසැකවම සිතා බැලී‍මට වටී. {'මට වෙබ් සෙවුම වෙත ප්‍රවේශය ඇති අතර,' if web_search_enabled else 'මට දැන් තථ්‍ය කාලීන තොරතුරු වෙත ප්‍රවේශයක් නොමැති නමුත්,'} මේ වැනි විෂයන් බොහෝ විට ප්‍රවේශමෙන් සලකා බැලීමෙන් ප්‍රයෝජන ලබන බව මට කිව හැකිය.",
                f"'{user_input}' සම්බන්ධයෙන්, මෙය මා සමඟ බෙදා ගැනීම ගැන මම අගය කරමි. {'වෙබ් සම්බන්ධතාවය සමඟ වුවද,' if web_search_enabled else 'වෙබ් සම්බන්ධතාවයක් නොමැතිව වුවද,'} මෙම විෂයේ විවිධ අංශ ගවේෂණය කිරීම බොහෝ විට වටිනා අවබෝධයන්ට මග පාදන බව මට යෝජනා කළ හැකිය.",
                f"ඔබ '{user_input}' ගැන අසන බව මට පෙනේ. මෙය සිත්ගන්නා සුළු ක්ෂේත්‍රයක් වන අතර, {'වෙබ් සෙවුම සක්‍රීය කර ඇති අතර,' if web_search_enabled else 'මම නොබැඳි ප්‍රකාරයේ සිටින අතර,'} ඔබේ වැනි ප්‍රශ්න බොහෝ විට විෂය පිළිබඳ සිත්ගන්නා සුළු සාකච්ඡා විවෘත කරන බව මට කිව හැකිය."
            ]
        }
    }
    
    # Get language-specific patterns
    lang_patterns = patterns.get(language, patterns['en'])
    
    # Check for specific patterns
    for category, data in lang_patterns.items():
        if category == 'default':
            continue
        
        for pattern in data['patterns']:
            if pattern in user_lower:
                response = random.choice(data['responses'])
                print(f"✅ Pattern matched: {category} -> {pattern}", file=sys.stderr)
                return response
    
    # Return default response
    response = random.choice(lang_patterns['default'])
    print(f"✅ Using default response", file=sys.stderr)
    return response

def generate_fallback_response(user_input: str, language: str = 'en', web_search_enabled: bool = True) -> str:
    """
    Generate fallback response when OpenRouter API is not available
    Uses enhanced pattern matching for better responses
    """
    return generate_enhanced_fallback_response(user_input, language, web_search_enabled)

def generate_system_message(user_input: str, language: str = 'en', web_search_enabled: bool = True) -> str:
    """
    Main function to generate system responses
    First tries OpenRouter API, falls back to enhanced local responses if needed
    """
    
    print(f"🎯 SYSTEM MESSAGE GENERATION:", file=sys.stderr)
    print(f"   Input: \"{user_input}\"", file=sys.stderr)
    print(f"   Language: {language}", file=sys.stderr)
    print(f"   Web Search: {'Enabled' if web_search_enabled else 'Disabled'}", file=sys.stderr)
    print(f"   API Key Configured: {'Yes' if OPENROUTER_API_KEY != 'your-openrouter-api-key-here' else 'No'}", file=sys.stderr)
    print(f"   Network Available: {'Yes' if NETWORK_AVAILABLE else 'No'}", file=sys.stderr)
    
    # Check if API key is configured and network is available
    if (OPENROUTER_API_KEY == 'your-openrouter-api-key-here' or 
        not OPENROUTER_API_KEY or 
        not NETWORK_AVAILABLE):
        # Use enhanced fallback response if no API key is configured or network unavailable
        print("🔄 Using fallback response (API key not configured or network unavailable)", file=sys.stderr)
        return generate_fallback_response(user_input, language, web_search_enabled)
    
    # Try OpenRouter API first
    print("🚀 Attempting OpenRouter API call...", file=sys.stderr)
    api_result = call_openrouter_api(user_input, language, web_search_enabled)
    
    if api_result['success']:
        print("✅ API call successful, returning API response", file=sys.stderr)
        return api_result['response']
    else:
        # Fall back to enhanced local response if API fails
        print("🔄 API call failed, using fallback response", file=sys.stderr)
        return generate_fallback_response(user_input, language, web_search_enabled)

if __name__ == "__main__":
    try:
        # Read input from command line arguments
        if len(sys.argv) < 2:
            print(json.dumps({"success": False, "error": "No input provided"}))
            sys.exit(1)
        
        user_input = sys.argv[1]
        language = sys.argv[2] if len(sys.argv) > 2 else 'en'
        web_search_enabled = sys.argv[3].lower() == 'true' if len(sys.argv) > 3 else True
        
        print(f"\n🎬 PYTHON BACKEND STARTED", file=sys.stderr)
        print(f"   Arguments received: {len(sys.argv) - 1}", file=sys.stderr)
        print(f"   User Input: \"{user_input}\"", file=sys.stderr)
        print(f"   Language: {language}", file=sys.stderr)
        print(f"   Web Search: {'Enabled' if web_search_enabled else 'Disabled'}", file=sys.stderr)
        
        # Generate response
        response = generate_system_message(user_input, language, web_search_enabled)
        
        # Return JSON response
        result = {
            "success": True,
            "response": response,
            "language": language,
            "web_search_enabled": web_search_enabled,
            "api_used": "openrouter" if (OPENROUTER_API_KEY != 'your-openrouter-api-key-here' and NETWORK_AVAILABLE) else "fallback",
            "network_available": NETWORK_AVAILABLE
        }
        
        print(f"🎉 RESPONSE GENERATED SUCCESSFULLY", file=sys.stderr)
        print(f"   Response length: {len(response)} characters", file=sys.stderr)
        print(f"   API used: {result['api_used']}", file=sys.stderr)
        print(f"   Returning to Node.js...\n", file=sys.stderr)
        
        print(json.dumps(result))
        
    except Exception as e:
        print(f"💥 PYTHON BACKEND ERROR: {str(e)}", file=sys.stderr)
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)