import os
import pickle
import json
import base64
import logging
import math
from upstash_redis import Redis
from upstash_redis.errors import UpstashError

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Redis configuration
redis_url = os.environ.get("UPSTASH_REDIS_REST_URL")
redis_token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")

# Max chunk size (slightly less than 1MB to be safe)
MAX_CHUNK_SIZE = 900000  

# Default TTL in seconds (1 hour)
DEFAULT_TTL = 3600

# Initialize Redis client using environment variables
redis = Redis(redis_url, redis_token)

def _chunk_data(data, max_size=MAX_CHUNK_SIZE):
    """Split data into chunks of max_size"""
    return [data[i:i+max_size] for i in range(0, len(data), max_size)]

def cache_portfolio(portfolio_id, portfolio_obj, ttl=DEFAULT_TTL):
    """Cache a portfolio object with chunking support"""
    # Serialize the object
    serialized = pickle.dumps(portfolio_obj)
    base64_data = base64.b64encode(serialized).decode('utf-8')
    
    # Check if we need chunking
    if len(base64_data) > MAX_CHUNK_SIZE:
        chunks = _chunk_data(base64_data)
        chunk_count = len(chunks)
        
        # Store chunk metadata
        redis.set(f"portfolio:{portfolio_id}:meta", json.dumps({
            "chunked": True,
            "chunks": chunk_count
        }), ex=ttl)
        
        # Store each chunk
        for i, chunk in enumerate(chunks):
            redis.set(f"portfolio:{portfolio_id}:chunk:{i}", chunk, ex=ttl)
            
        logger.info(f"Portfolio {portfolio_id} cached in Redis (chunked into {chunk_count} parts)")
    else:
        # Store as a single value
        redis.set(f"portfolio:{portfolio_id}", base64_data, ex=ttl)
        # Delete any potential metadata from previous chunked storage
        redis.delete(f"portfolio:{portfolio_id}:meta")
        logger.info(f"Portfolio {portfolio_id} cached in Redis (single chunk)")


def get_cached_portfolio(portfolio_id):
    """Get a portfolio from cache with chunking support"""
    # Check memory cache first
    memory_key = f"portfolio:{portfolio_id}"
    
    if redis is None:
        return None
    
    try:
        # Check if we have metadata indicating chunked storage
        meta_key = f"portfolio:{portfolio_id}:meta"
        meta = redis.get(meta_key)
        
        if meta:
            # We have chunked data
            meta_data = json.loads(meta)
            chunk_count = meta_data.get("chunks", 0)
            
            # Retrieve all chunks
            combined_data = ""
            for i in range(chunk_count):
                chunk = redis.get(f"portfolio:{portfolio_id}:chunk:{i}")
                if chunk is None:
                    logger.error(f"Missing chunk {i} for portfolio {portfolio_id}")
                    return None
                combined_data += chunk
                
            # Decode and deserialize
            binary_data = base64.b64decode(combined_data)
            result = pickle.loads(binary_data)
            logger.info(f"Retrieved chunked portfolio {portfolio_id} from Redis ({chunk_count} chunks)")
            return result
        else:
            # Try to get as a single value
            cached = redis.get(f"portfolio:{portfolio_id}")
            if cached:
                binary_data = base64.b64decode(cached)
                result = pickle.loads(binary_data)
                logger.info(f"Retrieved portfolio {portfolio_id} from Redis")
                return result
            
    except Exception as e:
        logger.error(f"Error retrieving portfolio {portfolio_id} from Redis: {e}")
    
    return None

def cache_strategy(strategy_key, strategy_obj, ttl=DEFAULT_TTL):
    """Cache a strategy object with chunking support"""
    # Serialize the object
    serialized = pickle.dumps(strategy_obj)
    base64_data = base64.b64encode(serialized).decode('utf-8')
    
    # Check if we need chunking
    if len(base64_data) > MAX_CHUNK_SIZE:
        chunks = _chunk_data(base64_data)
        chunk_count = len(chunks)
        
        # Store chunk metadata
        redis.set(f"strategy:{strategy_key}:meta", json.dumps({
            "chunked": True,
            "chunks": chunk_count
        }), ex=ttl)
        
        # Store each chunk
        for i, chunk in enumerate(chunks):
            redis.set(f"strategy:{strategy_key}:chunk:{i}", chunk, ex=ttl)
            
        logger.info(f"Strategy {strategy_key} cached in Redis (chunked into {chunk_count} parts)")
    else:
        # Store as a single value
        redis.set(f"strategy:{strategy_key}", base64_data, ex=ttl)
        # Delete any potential metadata from previous chunked storage
        redis.delete(f"strategy:{strategy_key}:meta")
        logger.info(f"Strategy {strategy_key} cached in Redis (single chunk)")

def get_cached_strategy(strategy_key):
    """Get a strategy from cache with chunking support"""
    if redis is None:
        return None
    
    try:
        # Check if we have metadata indicating chunked storage
        meta_key = f"strategy:{strategy_key}:meta"
        meta = redis.get(meta_key)
        
        if meta:
            # We have chunked data
            meta_data = json.loads(meta)
            chunk_count = meta_data.get("chunks", 0)
            
            # Retrieve all chunks
            combined_data = ""
            for i in range(chunk_count):
                chunk = redis.get(f"strategy:{strategy_key}:chunk:{i}")
                if chunk is None:
                    logger.error(f"Missing chunk {i} for strategy {strategy_key}")
                    return None
                combined_data += chunk
                
            # Decode and deserialize
            binary_data = base64.b64decode(combined_data)
            result = pickle.loads(binary_data)
            logger.info(f"Retrieved chunked strategy {strategy_key} from Redis ({chunk_count} chunks)")
            return result
        else:
            # Try to get as a single value
            cached = redis.get(f"strategy:{strategy_key}")
            if cached:
                binary_data = base64.b64decode(cached)
                result = pickle.loads(binary_data)
                logger.info(f"Retrieved strategy {strategy_key} from Redis")
                return result
            
    except Exception as e:
        logger.error(f"Error retrieving strategy {strategy_key} from Redis: {e}")
    
    return None

def clear_cache(pattern="*"):
    """Clear cache matching pattern"""
    if redis is not None:
        try:
            # For chunked data, we need to find all related keys
            if pattern == "*":
                all_keys = redis.keys("*")
            else:
                # Get direct matches and potential chunk keys
                pattern_keys = redis.keys(f"*{pattern}*")
                chunk_pattern_keys = redis.keys(f"*{pattern}*:chunk:*")
                meta_pattern_keys = redis.keys(f"*{pattern}*:meta")
                all_keys = list(set(pattern_keys + chunk_pattern_keys + meta_pattern_keys))
            
            if all_keys:
                redis.delete(*all_keys)
                redis_cleared = len(all_keys)
                cleared += redis_cleared
                logger.info(f"Cleared {redis_cleared} items from Redis")
        except Exception as e:
            logger.error(f"Error clearing Redis cache: {e}")
    
    return cleared