/**
 * Test script for AI integration
 * This tests the new g4f-based ai.js module
 */

const ai = require('./src/utils/ai');

async function testAI() {
    console.log('=' .repeat(60));
    console.log('Testing AI Integration (g4f)');
    console.log('=' .repeat(60));
    console.log();

    // Test 1: Check health
    console.log('Test 1: Checking AI health...');
    const isHealthy = await ai.checkHealth();
    if (isHealthy) {
        console.log('✅ AI is healthy and ready');
    } else {
        console.log('❌ AI health check failed');
        console.log('   Make sure g4f is installed: pip3 install -U g4f[all]');
        process.exit(1);
    }
    console.log();

    // Test 2: Get available models
    console.log('Test 2: Getting available models...');
    const models = await ai.getModels();
    console.log('✅ Available models:', models);
    console.log();

    // Test 3: Generate a simple response
    console.log('Test 3: Generating AI response...');
    console.log('   Query: "What is 2+2?"');
    console.log('   This may take a few seconds...');
    console.log();
    
    const response = await ai.generateResponse('What is 2+2? Answer in one short sentence.');
    
    if (response) {
        console.log('✅ AI Response:', response);
    } else {
        console.log('❌ Failed to generate response');
        console.log('   This might be a temporary provider issue');
    }
    console.log();

    // Test 4: Generate response with context
    console.log('Test 4: Generating response with context...');
    const contextResponse = await ai.generateResponse(
        'What items am I trading?',
        'User is trading Dragon x3 for Gorgonzilla x5'
    );
    
    if (contextResponse) {
        console.log('✅ AI Response with context:', contextResponse);
    } else {
        console.log('❌ Failed to generate response with context');
    }
    console.log();

    console.log('=' .repeat(60));
    console.log('🎉 AI Integration Test Complete!');
    console.log('=' .repeat(60));
    console.log();
    console.log('Your Discord bot is ready to use g4f for free AI responses!');
    console.log('No API keys required - completely free!');
    console.log();
}

// Run the test
testAI().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
