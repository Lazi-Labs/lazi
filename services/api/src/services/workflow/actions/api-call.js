/**
 * API Call Action Handler
 * Makes HTTP requests to external APIs
 */

import { createModuleLogger } from '../../../utils/logger.js';

const logger = createModuleLogger('workflow-action-api');

/**
 * Replace template variables in a string
 */
function interpolate(template, variables) {
  if (typeof template !== 'string') return template;
  
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  return result;
}

/**
 * Interpolate all string values in an object
 */
function interpolateObject(obj, variables) {
  if (typeof obj === 'string') {
    return interpolate(obj, variables);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => interpolateObject(item, variables));
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, variables);
    }
    return result;
  }
  
  return obj;
}

/**
 * API call action handler
 */
export async function apiCallAction(instance, step, context) {
  const { 
    url, 
    method = 'POST', 
    headers = {}, 
    body,
    timeout = 30000,
    expectedStatus = [200, 201, 204],
  } = step.config || {};
  
  if (!url) {
    throw new Error('API call action requires url in config');
  }
  
  // Prepare variables for interpolation
  const variables = {
    ...context,
    entity_type: instance.entity_type,
    entity_id: instance.entity_id,
    instance_id: instance.id,
  };
  
  // Interpolate URL, headers, and body
  const finalUrl = interpolate(url, variables);
  const finalHeaders = interpolateObject(headers, variables);
  const finalBody = body ? interpolateObject(body, variables) : undefined;
  
  logger.info('Making API call', {
    instanceId: instance.id,
    url: finalUrl,
    method,
  });
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(finalUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...finalHeaders,
      },
      body: finalBody ? JSON.stringify(finalBody) : undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const statusOk = Array.isArray(expectedStatus) 
      ? expectedStatus.includes(response.status)
      : response.status === expectedStatus;
    
    let responseBody;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }
    
    if (!statusOk) {
      throw new Error(`API call failed with status ${response.status}: ${JSON.stringify(responseBody)}`);
    }
    
    logger.info('API call successful', {
      instanceId: instance.id,
      status: response.status,
    });
    
    return {
      success: true,
      status: response.status,
      response: responseBody,
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`API call timed out after ${timeout}ms`);
    }
    throw error;
  }
}

export default apiCallAction;
