const net = require('net');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const client = new net.Socket();
const PORT = 3000;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('Conectado al servidor.');
});

client.on('data', (data) => {
  console.log(`Evento recibido: ${data.toString().trim()}`);
});

client.on('close', () => {
  console.log('Conexión cerrada.');
});

rl.on('line', (input) => {
  const message = input.trim();
  client.write(message);
});

rl.on('SIGINT', () => {
  client.end();
  rl.close();
  console.log('Cliente terminado.');
});
