import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_OPENAI_API_KEY;

console.log('🔑 Probando API Key...');
console.log('   ', apiKey.substring(0, 20) + '...');

fetch('https://api.openai.com/v1/models', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
})
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error('❌ ERROR:', data.error.message);
      console.error('📍 Razón:', data.error.type);
      if (data.error.message.includes('invalidated')) {
        console.log('\n💡 Soluciones:');
        console.log('   1. Verificar que la API key sea válida (copiar nuevamente)');
        console.log('   2. Revisar que tu cuenta OpenAI tenga forma de pago activa');
        console.log('   3. Verificar que tengas créditos disponibles');
      }
    } else if (data.data) {
      console.log('✅ API Key VÁLIDA y ACTIVA');
      console.log('📊 Total de modelos disponibles:', data.data.length);
      console.log('\n🚀 Ahora puedes usar OCR sin problemas');
    }
  })
  .catch(err => {
    console.error('🔴 Error de conexión:', err.message);
  });
