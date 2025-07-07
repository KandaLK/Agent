"""
Web Search Tool using Firecrawl API
Performs real-time web searches for cloud service information
"""

import asyncio
import json
import aiohttp
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import re

from ..core.tool_registry import BaseTool, ToolResult

logger = logging.getLogger(__name__)

class WebSearchTool(BaseTool):
    """
    Web search tool using Firecrawl API for real-time cloud service information
    """
    
    def __init__(self):
        super().__init__(
            name="web_search",
            description="Search the web for real-time cloud service information using Firecrawl API",
            category="search"
        )
        
        # Firecrawl API configuration
        self.firecrawl_api_key = "your-firecrawl-api-key"  # Should be in environment
        self.firecrawl_base_url = "https://api.firecrawl.dev/v0"
        
        # Search configuration
        self.max_results = 10
        self.timeout = 30
        
        # Cloud service domains for targeted search
        self.cloud_domains = [
            "docs.aws.amazon.com",
            "docs.microsoft.com",
            "cloud.google.com",
            "docs.oracle.com",
            "www.ibm.com/cloud",
            "help.aliyun.com"
        ]
        
        # Search query templates
        self.query_templates = {
            "troubleshooting": "{query} troubleshooting guide solution",
            "comparison": "{query} comparison differences features",
            "configuration": "{query} configuration setup guide",
            "performance": "{query} performance optimization best practices",
            "pricing": "{query} pricing cost calculator",
            "security": "{query} security best practices compliance"
        }

    async def execute(self, query: str, context: Any) -> ToolResult:
        """Execute web search using Firecrawl API"""
        
        start_time = datetime.now()
        
        try:
            # Enhance query based on context
            enhanced_query = await self._enhance_query(query, context)
            
            # Perform web search
            search_results = await self._perform_web_search(enhanced_query, context)
            
            # Filter and process results
            processed_results = await self._process_search_results(search_results, query, context)
            
            # Extract sources
            sources = [result.get("url", "") for result in processed_results if result.get("url")]
            
            # Calculate confidence
            confidence = await self._calculate_confidence(query, processed_results)
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            return ToolResult(
                tool_name=self.name,
                success=True,
                results=processed_results,
                sources=sources,
                confidence=confidence,
                response_time=response_time,
                metadata={
                    "enhanced_query": enhanced_query,
                    "total_results": len(search_results),
                    "processed_results": len(processed_results),
                    "search_type": "web"
                }
            )
            
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            response_time = (datetime.now() - start_time).total_seconds()
            
            return ToolResult(
                tool_name=self.name,
                success=False,
                results=[],
                sources=[],
                confidence=0.0,
                response_time=response_time,
                error_message=str(e)
            )

    async def _enhance_query(self, query: str, context: Any) -> str:
        """Enhance search query based on context and query type"""
        
        # Get query type from context
        query_type = getattr(context, 'query_type', None)
        if hasattr(query_type, 'value'):
            query_type = query_type.value
        
        # Apply query template if available
        if query_type and query_type in self.query_templates:
            enhanced_query = self.query_templates[query_type].format(query=query)
        else:
            enhanced_query = query
        
        # Add cloud service context
        enhanced_query += " cloud services AWS Azure"
        
        # Add provider-specific terms if detected
        detected_providers = getattr(context, 'detected_providers', [])
        if detected_providers:
            enhanced_query += " " + " ".join(detected_providers)
        
        # Add service-specific terms if detected
        detected_services = getattr(context, 'detected_services', [])
        if detected_services:
            service_terms = []
            for service_info in detected_services:
                if ':' in service_info:
                    _, service = service_info.split(':', 1)
                    service_terms.append(service)
            enhanced_query += " " + " ".join(service_terms)
        
        logger.info(f"Enhanced query: {enhanced_query}")
        return enhanced_query

    async def _perform_web_search(self, query: str, context: Any) -> List[Dict[str, Any]]:
        """Perform web search using Firecrawl API"""
        
        # Mock implementation - replace with actual Firecrawl API calls
        # In production, this would make real API calls to Firecrawl
        
        mock_results = [
            {
                "title": "AWS EC2 Instance Types - Amazon Web Services",
                "url": "https://docs.aws.amazon.com/ec2/latest/userguide/instance-types.html",
                "content": "Amazon EC2 provides a wide selection of instance types optimized to fit different use cases. Instance types comprise varying combinations of CPU, memory, storage, and networking capacity.",
                "domain": "docs.aws.amazon.com",
                "timestamp": datetime.now().isoformat()
            },
            {
                "title": "Azure Virtual Machine sizes - Microsoft Docs",
                "url": "https://docs.microsoft.com/en-us/azure/virtual-machines/sizes",
                "content": "Azure offers a variety of virtual machine sizes for different workloads. Choose the right size for your application based on CPU, memory, and storage requirements.",
                "domain": "docs.microsoft.com",
                "timestamp": datetime.now().isoformat()
            },
            {
                "title": "Google Cloud Compute Engine Machine Types",
                "url": "https://cloud.google.com/compute/docs/machine-types",
                "content": "Compute Engine offers predefined machine types for every need from micro instances to instances with up to 11.5 TB of memory, 128 vCPUs, and 64 TB of local SSD space.",
                "domain": "cloud.google.com",
                "timestamp": datetime.now().isoformat()
            }
        ]
        
        # Filter results based on query relevance
        relevant_results = []
        query_lower = query.lower()
        
        for result in mock_results:
            # Simple relevance check
            title_match = any(word in result["title"].lower() for word in query_lower.split())
            content_match = any(word in result["content"].lower() for word in query_lower.split())
            
            if title_match or content_match:
                relevant_results.append(result)
        
        return relevant_results

    async def _perform_firecrawl_search(self, query: str) -> List[Dict[str, Any]]:
        """Actual Firecrawl API implementation (for production use)"""
        
        headers = {
            "Authorization": f"Bearer {self.firecrawl_api_key}",
            "Content-Type": "application/json"
        }
        
        search_payload = {
            "query": query,
            "limit": self.max_results,
            "include_domains": self.cloud_domains,
            "format": "markdown"
        }
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
            try:
                async with session.post(
                    f"{self.firecrawl_base_url}/search",
                    headers=headers,
                    json=search_payload
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        return data.get("results", [])
                    else:
                        logger.error(f"Firecrawl API error: {response.status}")
                        return []
                        
            except asyncio.TimeoutError:
                logger.error("Firecrawl API timeout")
                return []
            except Exception as e:
                logger.error(f"Firecrawl API request failed: {e}")
                return []

    async def _process_search_results(self, results: List[Dict[str, Any]], 
                                    original_query: str, context: Any) -> List[Dict[str, Any]]:
        """Process and filter search results"""
        
        processed = []
        
        for result in results:
            # Extract and clean content
            content = self._extract_content(result)
            
            # Calculate relevance score
            relevance_score = await self._calculate_relevance(original_query, result)
            
            # Skip low-relevance results
            if relevance_score < 0.3:
                continue
            
            # Format result
            processed_result = {
                "title": result.get("title", ""),
                "content": content,
                "url": result.get("url", ""),
                "domain": result.get("domain", ""),
                "relevance_score": relevance_score,
                "source": "web_search",
                "timestamp": result.get("timestamp", datetime.now().isoformat())
            }
            
            processed.append(processed_result)
        
        # Sort by relevance score
        processed.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return processed[:5]  # Return top 5 results

    def _extract_content(self, result: Dict[str, Any]) -> str:
        """Extract and clean content from search result"""
        
        content = result.get("content", "")
        
        # Clean up content
        content = re.sub(r'\s+', ' ', content)  # Normalize whitespace
        content = content.strip()
        
        # Truncate if too long
        if len(content) > 500:
            content = content[:500] + "..."
        
        return content

    async def _calculate_relevance(self, query: str, result: Dict[str, Any]) -> float:
        """Calculate relevance score for a search result"""
        
        query_words = set(query.lower().split())
        
        # Check title relevance
        title = result.get("title", "").lower()
        title_words = set(title.split())
        title_overlap = len(query_words.intersection(title_words)) / len(query_words) if query_words else 0
        
        # Check content relevance
        content = result.get("content", "").lower()
        content_words = set(content.split())
        content_overlap = len(query_words.intersection(content_words)) / len(query_words) if query_words else 0
        
        # Check domain authority (cloud service domains get boost)
        domain = result.get("domain", "")
        domain_boost = 0.2 if any(cloud_domain in domain for cloud_domain in self.cloud_domains) else 0
        
        # Calculate weighted relevance
        relevance = (title_overlap * 0.4 + content_overlap * 0.4 + domain_boost * 0.2)
        
        return min(1.0, relevance)

    async def _calculate_confidence(self, query: str, results: List[Dict[str, Any]]) -> float:
        """Calculate confidence in search results"""
        
        if not results:
            return 0.0
        
        # Base confidence on average relevance score
        avg_relevance = sum(result.get("relevance_score", 0) for result in results) / len(results)
        
        # Boost confidence for official documentation
        official_domains = ["docs.aws.amazon.com", "docs.microsoft.com", "cloud.google.com"]
        official_results = sum(1 for result in results 
                             if any(domain in result.get("domain", "") for domain in official_domains))
        
        official_boost = min(0.3, official_results * 0.1)
        
        # Boost confidence for multiple relevant results
        result_count_boost = min(0.2, len(results) * 0.04)
        
        confidence = min(0.95, avg_relevance + official_boost + result_count_boost)
        
        return confidence

    async def validate_input(self, query: str, context: Any) -> bool:
        """Validate if web search is appropriate for the query"""
        
        if not query or not query.strip():
            return False
        
        # Check if web search is enabled in user preferences
        user_preferences = getattr(context, 'user_preferences', {})
        if not user_preferences.get('web_search_enabled', True):
            return False
        
        # Check if query benefits from real-time information
        real_time_indicators = [
            'latest', 'new', 'recent', 'current', 'updated', 'pricing', 'cost',
            'announcement', 'release', 'version', 'status', 'outage'
        ]
        
        query_lower = query.lower()
        needs_real_time = any(indicator in query_lower for indicator in real_time_indicators)
        
        # Always allow web search for cloud service queries
        cloud_related = any(keyword in query_lower for keyword in 
                          ['aws', 'azure', 'cloud', 'google cloud', 'gcp'])
        
        return cloud_related or needs_real_time

    async def search_specific_domain(self, query: str, domain: str) -> List[Dict[str, Any]]:
        """Search within a specific domain"""
        
        # Add site-specific search
        domain_query = f"site:{domain} {query}"
        
        # Mock implementation
        mock_results = [
            {
                "title": f"Search result from {domain}",
                "url": f"https://{domain}/search-result",
                "content": f"Relevant information about {query} from {domain}",
                "domain": domain,
                "timestamp": datetime.now().isoformat()
            }
        ]
        
        return mock_results

    async def get_trending_topics(self, category: str = "cloud") -> List[Dict[str, Any]]:
        """Get trending topics in cloud services"""
        
        # Mock trending topics
        trending = [
            {
                "topic": "AWS Lambda Cold Starts",
                "trend_score": 0.9,
                "category": "serverless",
                "description": "Optimization techniques for reducing Lambda cold start times"
            },
            {
                "topic": "Azure Container Instances",
                "trend_score": 0.8,
                "category": "containers",
                "description": "Serverless containers in Azure"
            },
            {
                "topic": "Google Cloud Run",
                "trend_score": 0.7,
                "category": "serverless",
                "description": "Fully managed serverless platform"
            }
        ]
        
        return trending

    def get_search_stats(self) -> Dict[str, Any]:
        """Get search statistics"""
        
        return {
            "total_searches": self.metadata.usage_count,
            "success_rate": self.metadata.success_rate,
            "average_response_time": self.metadata.average_response_time,
            "supported_domains": len(self.cloud_domains),
            "query_templates": len(self.query_templates)
        }