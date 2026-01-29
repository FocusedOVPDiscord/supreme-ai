// Test script for AI functionality
require('dotenv').config();
const ai = require('./src/utils/ai');

console.log('🧪 Testing Supreme AI - Groq Integration\n');

async function runTests() {
    // Test 1: Check API health
    console.log('Test 1: Checking Groq API health...');
    try {
        const isHealthy = await ai.checkHealth();
        if (isHealthy) {
            console.log('✅ Groq API is healthy and accessible\n');
        } else {
            console.log('❌ Groq API is not accessible (check API key)\n');
        }
    } catch (error) {
        console.error('❌ Health check failed:', error.message, '\n');
    }

    // Test 2: Generate simple response
    console.log('Test 2: Generating simple response...');
    try {
        const response = await ai.generateResponse('Hello, how are you?');
        if (response) {
            console.log('✅ Response generated successfully:');
            console.log(`   "${response}"\n`);
        } else {
            console.log('❌ Failed to generate response\n');
        }
    } catch (error) {
        console.error('❌ Response generation failed:', error.message, '\n');
    }

    // Test 3: Generate response with context
    console.log('Test 3: Generating response with context...');
    try {
        const context = 'User: I need help with my account\nAI: Sure, I can help you with that. What specific issue are you facing?';
        const response = await ai.generateResponse('I forgot my password', context);
        if (response) {
            console.log('✅ Contextual response generated:');
            console.log(`   "${response}"\n`);
        } else {
            console.log('❌ Failed to generate contextual response\n');
        }
    } catch (error) {
        console.error('❌ Contextual response failed:', error.message, '\n');
    }

    // Test 4: Test support-related query
    console.log('Test 4: Testing support query...');
    try {
        const response = await ai.generateResponse('How do I create a support ticket?');
        if (response) {
            console.log('✅ Support response generated:');
            console.log(`   "${response}"\n`);
        } else {
            console.log('❌ Failed to generate support response\n');
        }
    } catch (error) {
        console.error('❌ Support query failed:', error.message, '\n');
    }

    // Test 5: Get available models
    console.log('Test 5: Fetching available models...');
    try {
        const models = await ai.getModels();
        if (models.length > 0) {
            console.log(`✅ Found ${models.length} available models:`);
            models.slice(0, 5).forEach(model => {
                console.log(`   - ${model.id}`);
            });
            console.log();
        } else {
            console.log('⚠️ No models found (API key might be invalid)\n');
        }
    } catch (error) {
        console.error('❌ Model fetch failed:', error.message, '\n');
    }

    console.log('🎉 All AI tests completed!\n');
    
    // Check if API key is set
    if (!process.env.GROQ_API_KEY) {
        console.log('⚠️  WARNING: GROQ_API_KEY is not set in .env file');
        console.log('   Get your API key from: https://console.groq.com\n');
    } else {
        console.log('✅ GROQ_API_KEY is configured');
        console.log(`   Key length: ${process.env.GROQ_API_KEY.length} characters\n`);
    }
}

runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
