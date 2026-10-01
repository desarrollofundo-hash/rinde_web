import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ VITE_OPENAI_API_KEY no configurada');
  process.exit(1);
}

console.log('🔑 API Key:', apiKey.substring(0, 20) + '...' + apiKey.substring(-10));

// Test simple
fetch('https://api.openai.com/v1/models', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
})
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error('❌ Error:', data.error.message);
      console.error('💡 Motivo: API key invalidada, sin créditos, o expirada');
    } else if (data.data) {
      console.log('✅ API Key válida y activa');
      console.log('📊 Modelos disponibles:', data.data.length);
    } else {
      console.log('⚠️ Respuesta inesperada:', data);
    }
  })
  .catch(err => console.error('Network error:', err.message));
