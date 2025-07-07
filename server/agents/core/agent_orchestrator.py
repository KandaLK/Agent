"""
Enhanced Agent Orchestrator with Parallel Processing and Multi-Language Support
Core decision-making engine for the Agentic RAG system
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from enum import Enum

from .memory_manager import EnhancedMemoryManager
from .language_processor import LanguageProcessor
from .domain_checker import DomainRelevanceChecker
from .quality_assessor import QualityAssessor
from .feedback_analyzer import UserFeedbackAnalyzer
from ..tools.tool_registry import ToolRegistry
from ..tools.vector_search import VectorSearchTool
from ..tools.web_search import WebSearchTool
from ..tools.translate import TranslationTool
from ..tools.rerank import RerankTool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QueryType(Enum):
    TROUBLESHOOTING = "troubleshooting"
    COMPARISON = "comparison"
    GENERAL_INQUIRY = "general_inquiry"
    CONFIGURATION = "configuration"
    PERFORMANCE = "performance"

@dataclass
class QueryContext:
    user_id: str
    thread_id: str
    query: str
    language: str
    query_type: QueryType
    confidence_score: float
    domain_relevance: float
    session_history: List[Dict]
    user_preferences: Dict

@dataclass
class AgentResponse:
    content: str
    confidence: float
    sources: List[str]
    tool_results: Dict[str, Any]
    processing_time: float
    language: str
    requires_clarification: bool = False
    clarification_questions: List[str] = None

class AgentOrchestrator:
    """
    Central orchestrator for the Enhanced Agentic RAG system
    Handles query processing, tool coordination, and response generation
    """
    
    def __init__(self):
        self.memory_manager = EnhancedMemoryManager()
        self.language_processor = LanguageProcessor()
        self.domain_checker = DomainRelevanceChecker()
        self.quality_assessor = QualityAssessor()
        self.feedback_analyzer = UserFeedbackAnalyzer()
        self.tool_registry = ToolRegistry()
        
        # Initialize tools
        self._initialize_tools()
        
        # Parallel processing configuration
        self.max_workers = 5
        self.task_timeout = 30
        
        # Quality thresholds
        self.domain_relevance_threshold = 0.7
        self.confidence_threshold = 0.8
        self.max_iterations = 3
        
        logger.info("Agent Orchestrator initialized successfully")

    def _initialize_tools(self):
        """Initialize and register all available tools"""
        tools = [
            VectorSearchTool(),
            WebSearchTool(),
            TranslationTool(),
            RerankTool()
        ]
        
        for tool in tools:
            self.tool_registry.register_tool(tool)
        
        logger.info(f"Registered {len(tools)} tools")

    async def process_query(self, user_id: str, thread_id: str, query: str, 
                          language: str = "en") -> AgentResponse:
        """
        Main entry point for query processing
        Implements the complete Agentic RAG workflow
        """
        start_time = datetime.now()
        
        try:
            # Step 1: Language Detection & Processing
            detected_language = await self.language_processor.detect_language(query)
            if language == "auto":
                language = detected_language
            
            logger.info(f"Processing query for user {user_id}, thread {thread_id}, language: {language}")
            
            # Step 2: Query Analysis & Context Building
            query_context = await self._build_query_context(
                user_id, thread_id, query, language
            )
            
            # Step 3: Domain Relevance Check
            if query_context.domain_relevance < self.domain_relevance_threshold:
                return await self._handle_irrelevant_query(query_context)
            
            # Step 4: Iterative Processing Loop
            response = await self._iterative_processing_loop(query_context)
            
            # Step 5: Response Finalization
            final_response = await self._finalize_response(response, query_context)
            
            # Step 6: Memory Update
            await self._update_memory(query_context, final_response)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            final_response.processing_time = processing_time
            
            logger.info(f"Query processed successfully in {processing_time:.2f}s")
            return final_response
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return await self._create_error_response(str(e), language)

    async def _build_query_context(self, user_id: str, thread_id: str, 
                                 query: str, language: str) -> QueryContext:
        """Build comprehensive context for query processing"""
        
        # Translate query to English if needed for processing
        english_query = query
        if language != "en":
            english_query = await self.language_processor.translate_to_english(query, language)
        
        # Analyze query type and domain relevance
        query_type = await self.domain_checker.classify_query_type(english_query)
        domain_relevance = await self.domain_checker.calculate_relevance_score(english_query)
        confidence_score = await self.domain_checker.calculate_confidence(english_query)
        
        # Retrieve session history and user preferences
        session_history = await self.memory_manager.get_session_history(user_id, thread_id)
        user_preferences = await self.memory_manager.get_user_preferences(user_id)
        
        return QueryContext(
            user_id=user_id,
            thread_id=thread_id,
            query=english_query,  # Store English version for processing
            language=language,
            query_type=query_type,
            confidence_score=confidence_score,
            domain_relevance=domain_relevance,
            session_history=session_history,
            user_preferences=user_preferences
        )

    async def _iterative_processing_loop(self, context: QueryContext) -> AgentResponse:
        """
        Main iterative processing loop with self-correction
        Implements parallel tool execution and quality assessment
        """
        iteration = 0
        best_response = None
        
        while iteration < self.max_iterations:
            iteration += 1
            logger.info(f"Processing iteration {iteration}")
            
            # Select appropriate tools based on query context
            selected_tools = await self._select_tools(context)
            
            # Execute tools in parallel
            tool_results = await self._execute_tools_parallel(context, selected_tools)
            
            # Assess result quality
            quality_score = await self.quality_assessor.assess_results(
                context.query, tool_results
            )
            
            # Generate response from tool results
            response = await self._synthesize_response(context, tool_results)
            
            # Check if response meets quality threshold
            if quality_score >= self.confidence_threshold:
                logger.info(f"Quality threshold met in iteration {iteration}")
                return response
            
            # Store best response so far
            if best_response is None or quality_score > best_response.confidence:
                best_response = response
            
            # Refine query for next iteration
            context.query = await self._refine_query(context, tool_results)
            
        logger.warning(f"Max iterations reached, returning best response")
        return best_response or await self._create_fallback_response(context)

    async def _select_tools(self, context: QueryContext) -> List[str]:
        """Select appropriate tools based on query context and type"""
        
        tool_selection = []
        
        # Always include vector search for knowledge base
        tool_selection.append("vector_search")
        
        # Add web search for real-time information
        if context.user_preferences.get("web_search_enabled", True):
            tool_selection.append("web_search")
        
        # Add reranking for better results
        tool_selection.append("rerank")
        
        # Query-type specific tool selection
        if context.query_type == QueryType.TROUBLESHOOTING:
            tool_selection.extend(["error_analyzer", "solution_finder"])
        elif context.query_type == QueryType.COMPARISON:
            tool_selection.extend(["service_comparator", "feature_analyzer"])
        elif context.query_type == QueryType.PERFORMANCE:
            tool_selection.extend(["performance_analyzer", "optimization_advisor"])
        
        logger.info(f"Selected tools: {tool_selection}")
        return tool_selection

    async def _execute_tools_parallel(self, context: QueryContext, 
                                    tool_names: List[str]) -> Dict[str, Any]:
        """Execute multiple tools in parallel with timeout handling"""
        
        results = {}
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tool tasks
            future_to_tool = {}
            for tool_name in tool_names:
                tool = self.tool_registry.get_tool(tool_name)
                if tool:
                    future = executor.submit(tool.execute, context.query, context)
                    future_to_tool[future] = tool_name
            
            # Collect results as they complete
            for future in as_completed(future_to_tool, timeout=self.task_timeout):
                tool_name = future_to_tool[future]
                try:
                    result = future.result()
                    results[tool_name] = result
                    logger.info(f"Tool {tool_name} completed successfully")
                except Exception as e:
                    logger.error(f"Tool {tool_name} failed: {str(e)}")
                    results[tool_name] = {"error": str(e), "success": False}
        
        return results

    async def _synthesize_response(self, context: QueryContext, 
                                 tool_results: Dict[str, Any]) -> AgentResponse:
        """Synthesize final response from tool results"""
        
        # Combine and rank all results
        combined_results = []
        sources = []
        
        for tool_name, result in tool_results.items():
            if result.get("success", False):
                combined_results.extend(result.get("results", []))
                sources.extend(result.get("sources", []))
        
        # Rerank results if rerank tool was used
        if "rerank" in tool_results and tool_results["rerank"].get("success"):
            combined_results = tool_results["rerank"]["results"]
        
        # Generate response content
        response_content = await self._generate_response_content(
            context, combined_results
        )
        
        # Calculate confidence score
        confidence = await self.quality_assessor.calculate_confidence(
            context.query, response_content, combined_results
        )
        
        # Translate response if needed
        if context.language != "en":
            response_content = await self.language_processor.translate_from_english(
                response_content, context.language
            )
        
        return AgentResponse(
            content=response_content,
            confidence=confidence,
            sources=list(set(sources)),
            tool_results=tool_results,
            processing_time=0,  # Will be set later
            language=context.language
        )

    async def _generate_response_content(self, context: QueryContext, 
                                       results: List[Dict]) -> str:
        """Generate comprehensive response content from results"""
        
        if not results:
            return await self._generate_no_results_response(context)
        
        # Build response based on query type
        if context.query_type == QueryType.TROUBLESHOOTING:
            return await self._generate_troubleshooting_response(context, results)
        elif context.query_type == QueryType.COMPARISON:
            return await self._generate_comparison_response(context, results)
        elif context.query_type == QueryType.CONFIGURATION:
            return await self._generate_configuration_response(context, results)
        else:
            return await self._generate_general_response(context, results)

    async def _generate_troubleshooting_response(self, context: QueryContext, 
                                               results: List[Dict]) -> str:
        """Generate troubleshooting-specific response"""
        
        response_parts = [
            "# Cloud Services Troubleshooting Guide\n",
            f"Based on your query: '{context.query}'\n\n"
        ]
        
        # Add step-by-step troubleshooting
        response_parts.append("## Troubleshooting Steps:\n")
        for i, result in enumerate(results[:5], 1):
            if result.get("content"):
                response_parts.append(f"{i}. {result['content']}\n")
        
        # Add additional resources
        response_parts.append("\n## Additional Resources:\n")
        for result in results:
            if result.get("url"):
                response_parts.append(f"- [{result.get('title', 'Resource')}]({result['url']})\n")
        
        return "".join(response_parts)

    async def _generate_comparison_response(self, context: QueryContext, 
                                          results: List[Dict]) -> str:
        """Generate service comparison response"""
        
        response_parts = [
            "# Cloud Services Comparison\n",
            f"Comparing services for: '{context.query}'\n\n"
        ]
        
        # Add comparison table or structured comparison
        response_parts.append("## Service Comparison:\n")
        for result in results[:3]:
            if result.get("content"):
                response_parts.append(f"### {result.get('service', 'Service')}\n")
                response_parts.append(f"{result['content']}\n\n")
        
        return "".join(response_parts)

    async def _generate_general_response(self, context: QueryContext, 
                                       results: List[Dict]) -> str:
        """Generate general response"""
        
        response_parts = [
            "# Cloud Services Information\n",
            f"Information about: '{context.query}'\n\n"
        ]
        
        for result in results[:5]:
            if result.get("content"):
                response_parts.append(f"- {result['content']}\n")
        
        return "".join(response_parts)

    async def _handle_irrelevant_query(self, context: QueryContext) -> AgentResponse:
        """Handle queries that are not relevant to cloud services"""
        
        clarification_questions = [
            "Are you asking about AWS or Azure cloud services?",
            "Is this related to cloud infrastructure or configuration?",
            "Could you specify which cloud service you're having issues with?"
        ]
        
        response_content = (
            "I specialize in AWS and Azure cloud services troubleshooting and advisory. "
            "Your query doesn't seem to be related to cloud services. "
            "Could you please clarify your question?"
        )
        
        if context.language != "en":
            response_content = await self.language_processor.translate_from_english(
                response_content, context.language
            )
        
        return AgentResponse(
            content=response_content,
            confidence=0.5,
            sources=[],
            tool_results={},
            processing_time=0,
            language=context.language,
            requires_clarification=True,
            clarification_questions=clarification_questions
        )

    async def _finalize_response(self, response: AgentResponse, 
                               context: QueryContext) -> AgentResponse:
        """Finalize response with additional processing"""
        
        # Add user-specific customizations
        if context.user_preferences.get("detailed_responses", False):
            response.content += "\n\n*Detailed explanation provided based on your preferences.*"
        
        # Add confidence indicator
        if response.confidence < 0.7:
            confidence_note = "\n\n*Note: This response has moderate confidence. Please verify the information.*"
            response.content += confidence_note
        
        return response

    async def _update_memory(self, context: QueryContext, response: AgentResponse):
        """Update memory with interaction data"""
        
        interaction_data = {
            "query": context.query,
            "response": response.content,
            "confidence": response.confidence,
            "tool_results": response.tool_results,
            "processing_time": response.processing_time,
            "timestamp": datetime.now().isoformat()
        }
        
        await self.memory_manager.store_interaction(
            context.user_id, context.thread_id, interaction_data
        )

    async def _refine_query(self, context: QueryContext, 
                          tool_results: Dict[str, Any]) -> str:
        """Refine query based on previous results for next iteration"""
        
        # Analyze what information is missing
        missing_aspects = await self.quality_assessor.identify_missing_information(
            context.query, tool_results
        )
        
        # Generate refined query
        refined_query = f"{context.query} {' '.join(missing_aspects)}"
        
        logger.info(f"Refined query: {refined_query}")
        return refined_query

    async def _create_error_response(self, error_message: str, language: str) -> AgentResponse:
        """Create error response"""
        
        content = f"I apologize, but I encountered an error while processing your request: {error_message}"
        
        if language != "en":
            content = await self.language_processor.translate_from_english(content, language)
        
        return AgentResponse(
            content=content,
            confidence=0.0,
            sources=[],
            tool_results={},
            processing_time=0,
            language=language
        )

    async def _create_fallback_response(self, context: QueryContext) -> AgentResponse:
        """Create fallback response when all iterations fail"""
        
        content = (
            "I'm having difficulty providing a comprehensive answer to your query. "
            "Could you please provide more specific details about your cloud service issue?"
        )
        
        if context.language != "en":
            content = await self.language_processor.translate_from_english(
                content, context.language
            )
        
        return AgentResponse(
            content=content,
            confidence=0.3,
            sources=[],
            tool_results={},
            processing_time=0,
            language=context.language,
            requires_clarification=True
        )

    async def process_feedback(self, user_id: str, thread_id: str, 
                             message_id: str, feedback_type: str):
        """Process user feedback for continuous learning"""
        
        await self.feedback_analyzer.process_feedback(
            user_id, thread_id, message_id, feedback_type
        )
        
        # Update user preferences based on feedback patterns
        patterns = await self.feedback_analyzer.analyze_user_patterns(user_id)
        await self.memory_manager.update_user_preferences(user_id, patterns)
        
        logger.info(f"Processed {feedback_type} feedback for user {user_id}")

    async def _generate_no_results_response(self, context: QueryContext) -> str:
        """Generate response when no results are found"""
        
        return (
            "I couldn't find specific information about your query in my knowledge base. "
            "This might be a very specific or new issue. Could you provide more details "
            "or try rephrasing your question?"
        )

    async def _generate_configuration_response(self, context: QueryContext, 
                                             results: List[Dict]) -> str:
        """Generate configuration-specific response"""
        
        response_parts = [
            "# Cloud Service Configuration Guide\n",
            f"Configuration steps for: '{context.query}'\n\n"
        ]
        
        response_parts.append("## Configuration Steps:\n")
        for i, result in enumerate(results[:5], 1):
            if result.get("content"):
                response_parts.append(f"{i}. {result['content']}\n")
        
        response_parts.append("\n## Best Practices:\n")
        response_parts.append("- Always backup your configuration before making changes\n")
        response_parts.append("- Test changes in a development environment first\n")
        response_parts.append("- Monitor performance after configuration changes\n")
        
        return "".join(response_parts)