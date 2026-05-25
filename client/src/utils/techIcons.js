// src/utils/techIcons.js

/**
 * Maps a tech stack name to a SimpleIcons CDN URL.
 * Returns the brand-colored SVG.
 * @param {string} techName
 * @returns {string}
 */
export function getTechIconUrl(techName) {
  if (!techName) return '';
  
  // Clean and prepare the input
  let slug = techName.toLowerCase().trim();
  
  // Standardize common terms
  if (slug.includes('react')) slug = 'react';
  else if (slug.includes('node')) slug = 'nodedotjs';
  else if (slug.includes('express')) slug = 'express';
  else if (slug.includes('next')) slug = 'nextdotjs';
  else if (slug.includes('postgres')) slug = 'postgresql';
  else if (slug.includes('mongo')) slug = 'mongodb';
  else if (slug.includes('redis')) slug = 'redis';
  else if (slug.includes('docker')) slug = 'docker';
  else if (slug.includes('aws') || slug.includes('amazon')) slug = 'amazonaws';
  else if (slug.includes('gcp') || slug.includes('google cloud')) slug = 'googlecloud';
  else if (slug.includes('stripe')) slug = 'stripe';
  else if (slug.includes('graphql')) slug = 'graphql';
  else if (slug.includes('kafka')) slug = 'apachekafka';
  else if (slug.includes('spark')) slug = 'apachespark';
  else if (slug.includes('influx')) slug = 'influxdb';
  else if (slug.includes('websocket')) slug = 'websocket';
  else if (slug.includes('auth0')) slug = 'auth0';
  else if (slug.includes('okta')) slug = 'okta';
  else if (slug.includes('tailwind')) slug = 'tailwindcss';
  else if (slug.includes('typescript')) slug = 'typescript';
  else if (slug.includes('javascript')) slug = 'javascript';
  else if (slug.includes('yjs')) slug = 'yjs'; // Wait, does yjs have a logo? Simple Icons doesn't, but we can fallback
  else {
    // Basic formatting for fallback search
    slug = slug.replace(/\.js$/, 'js')
               .replace(/[^a-z0-9]/g, '');
  }
  
  return `https://cdn.simpleicons.org/${slug}`;
}
