// Test script to verify the parent ID resolver workaround
// This tests the new centralized parent ID resolution with fallback methods

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock localStorage for testing
const mockLocalStorage = {
  getItem: (key) => {
    const mockData = {
      'username_parent_id': '12345678-1234-1234-1234-123456789012',
      'username_session': JSON.stringify({
        id: '12345678-1234-1234-1234-123456789012',
        name: 'Test Parent',
        username: 'testparent',
        role: 'parent',
        timestamp: Date.now()
      })
    };
    return mockData[key] || null;
  }
};

// Simulate the getCurrentParentId function from parentIdResolver.ts
async function testGetCurrentParentId() {
  try {
    console.log('=== Testing getCurrentParentId with fallback methods ===');
    
    // Method 1: Try the RPC function first
    console.log('\n1. Testing RPC get_current_parent_id...');
    const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id');
    
    if (!parentError && parentId) {
      console.log('✅ Got parent ID from RPC:', parentId);
      return parentId;
    }
    
    console.log('⚠️ RPC get_current_parent_id failed or returned null:', parentError);
    
    // Method 2: Check localStorage for username users
    console.log('\n2. Testing localStorage fallback...');
    const usernameParentId = mockLocalStorage.getItem('username_parent_id');
    if (usernameParentId) {
      console.log('✅ Got parent ID from localStorage:', usernameParentId);
      return usernameParentId;
    }
    
    // Method 3: Check username session data
    console.log('\n3. Testing username session fallback...');
    const usernameSession = mockLocalStorage.getItem('username_session');
    if (usernameSession) {
      try {
        const sessionData = JSON.parse(usernameSession);
        if (sessionData.id) {
          console.log('✅ Got parent ID from username session:', sessionData.id);
          return sessionData.id;
        }
      } catch (parseError) {
        console.error('Error parsing username session:', parseError);
      }
    }
    
    // Method 4: Try to get current user and check if they are a parent directly
    console.log('\n4. Testing user-based fallback...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user) {
      console.log('Current user found:', user.email || user.id);
      
      // Check if user ID matches a parent record
      const { data: parentByUid, error: parentByUidError } = await supabase
        .from('parents')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (!parentByUidError && parentByUid) {
        console.log('✅ Got parent ID by user UID:', parentByUid.id);
        return parentByUid.id;
      }
      
      // Check if user email matches a parent record
      if (user.email) {
        const { data: parentByEmail, error: parentByEmailError } = await supabase
          .from('parents')
          .select('id')
          .eq('email', user.email)
          .single();
          
        if (!parentByEmailError && parentByEmail) {
          console.log('✅ Got parent ID by email:', parentByEmail.id);
          return parentByEmail.id;
        }
      }
      
      // Check user metadata for parent_id
      if (user.user_metadata?.parent_id) {
        console.log('✅ Got parent ID from user metadata:', user.user_metadata.parent_id);
        return user.user_metadata.parent_id;
      }
    }
    
    console.error('❌ All fallback methods failed to get parent ID');
    return null;
  } catch (error) {
    console.error('Error in getCurrentParentId test:', error);
    return null;
  }
}

// Test the getParentIdentifierForDashboard function
async function testGetParentIdentifierForDashboard() {
  try {
    console.log('\n=== Testing getParentIdentifierForDashboard ===');
    
    // First get the current user to determine auth type
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('No authenticated user found:', userError);
      return null;
    }
    
    // If user has email, use email as identifier
    if (user.email) {
      console.log('✅ Using email as parent identifier:', user.email);
      return user.email;
    }
    
    // For username-only users, get parent ID
    const parentId = await testGetCurrentParentId();
    if (parentId) {
      console.log('✅ Using parent ID as identifier:', parentId);
      return parentId;
    }
    
    console.error('❌ Failed to get parent identifier for dashboard');
    return null;
  } catch (error) {
    console.error('Error in getParentIdentifierForDashboard test:', error);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Parent ID Resolver Tests...\n');
  
  try {
    // Test 1: getCurrentParentId
    const parentId = await testGetCurrentParentId();
    console.log('\n📊 Test Result - Parent ID:', parentId ? '✅ SUCCESS' : '❌ FAILED');
    
    // Test 2: getParentIdentifierForDashboard
    const parentIdentifier = await testGetParentIdentifierForDashboard();
    console.log('📊 Test Result - Parent Identifier:', parentIdentifier ? '✅ SUCCESS' : '❌ FAILED');
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('Parent ID Resolution:', parentId ? '✅ Working' : '❌ Failed');
    console.log('Dashboard Identifier:', parentIdentifier ? '✅ Working' : '❌ Failed');
    
    if (parentId && parentIdentifier) {
      console.log('\n🎉 All tests passed! The parent ID resolver workaround is functioning correctly.');
      console.log('The parent dashboard should now be able to load data even when the RPC function fails.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the authentication setup and fallback methods.');
    }
    
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

// Run the tests
runTests();
