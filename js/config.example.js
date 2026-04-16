/**
 * VenueFlow Configuration Template
 * 
 * Instructions:
 * 1. Copy this file to `config.js` in the same directory
 * 2. Replace placeholder values with your actual API keys
 * 3. Never commit `config.js` to version control
 * 
 * Required Google Cloud APIs:
 * - Maps JavaScript API
 * - Gemini API (via AI Studio)
 * - Firebase (Realtime Database + Auth)
 */

// @ts-check

/** @type {import('./config').VenueFlowConfig} */
const VENUEFLOW_CONFIG = {
  // Google Maps JavaScript API Key
  // Get yours at: https://console.cloud.google.com/apis/credentials
  GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',

  // Google Gemini API Key  
  // Get yours at: https://aistudio.google.com/app/apikey
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',

  // Firebase Configuration
  // Get yours at: https://console.firebase.google.com/ → Project Settings
  FIREBASE_CONFIG: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'your-project.firebaseapp.com',
    databaseURL: 'https://your-project-default-rtdb.firebaseio.com',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000'
  },

  // Venue Configuration
  VENUE: {
    name: 'Narendra Modi Stadium',
    city: 'Ahmedabad, India',
    coordinates: { lat: 23.0927, lng: 72.5957 },
    capacity: 132000,
    mapZoom: 17
  }
};

// Freeze config to prevent accidental mutation
Object.freeze(VENUEFLOW_CONFIG);
Object.freeze(VENUEFLOW_CONFIG.FIREBASE_CONFIG);
Object.freeze(VENUEFLOW_CONFIG.VENUE);
Object.freeze(VENUEFLOW_CONFIG.VENUE.coordinates);
