const net = require('net');
const readline = require('readline');
const fs = require('fs');
const { Console } = require('console');

const server = net.createServer();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let events = {};
let eventSubscriptions = {};
let connectedClients = 0;

// Guardar los eventos en un archivo
function saveEventsToFile(fileName) {
  const data = JSON.stringify(events);

  fs.writeFile(fileName, data, (err) => {
    if (err) {
      console.error('Error al guardar los eventos:', err);
    } else {
      console.log('Eventos guardados correctamente en el archivo:', fileName);
    }
  });
}

// Cargar eventos desde un archivo
function loadEventsFromFile(fileName) {
  fs.readFile(fileName, (err, data) => {
    if (err) {
      console.error('Error al cargar los eventos:', err);
    } else {
      try {
        events = JSON.parse(data);
        console.log('Eventos cargados correctamente desde el archivo:', fileName);
      } catch (error) {
        console.error('Error al parsear los eventos:', error);
      }
    }
  });
}

// Función para manejar el comando 'add' -> Añade un evento
function addEvent(eventName) {
  if (!events[eventName]) {
    events[eventName] = [];
    console.log(`Evento "${eventName}" añadido.`);
  } else {
    console.log(`El evento "${eventName}" ya existe.`);
  }
}

// Función para manejar el comando 'sub' -> suscribe el usuario a un evento
function subscribe(socket, eventName) {
  if (!events[eventName]) {
    socket.write(`El evento "${eventName}" no existe.`);
    return;
  }

  if (!eventSubscriptions[eventName]) {
    eventSubscriptions[eventName] = [];
  }

  if (!eventSubscriptions[eventName].includes(socket)) {
    eventSubscriptions[eventName].push(socket);
    console.log(`Cliente suscrito al evento "${eventName}".`);
  } else {
    console.log(`El cliente ya está suscrito al evento "${eventName}".`);
  }
}

// Función para manejar el comando 'list' -> lisa los clientes suscitos a un evento
function listClients(socket, eventName) {
  if (eventSubscriptions[eventName]) {
    console.log(`Clientes suscritos a "${eventName}": ${eventSubscriptions[eventName].length}`);
  } else {
    console.log(`No hay eventos llamados "${eventName}".`);
  }
}

// Función para manejar el comando 'disconnect' -> desconecta el cliente del servidor
function disconnectClient(socket) {
  console.log('Cliente desconectado.');
  socket.end();

  Object.keys(eventSubscriptions).forEach(event => {
    eventSubscriptions[event] = eventSubscriptions[event].filter(client => client !== socket);
  });
}

// Función para manejar el comando 'unsub' -> Desuscribe al cliente de un evento
function unsubscribe(socket, eventName) {
  if (!eventSubscriptions[eventName] || eventSubscriptions[eventName].length === 0) {
    console.log(`El cliente no está suscrito al evento "${eventName}".`);
    return;
  }

  const index = eventSubscriptions[eventName].indexOf(socket);
  if (index !== -1) {
    eventSubscriptions[eventName].splice(index, 1);
    console.log(`Cliente se ha desuscrito del evento "${eventName}".`);
  } else {
    console.log(`El cliente no está suscrito al evento "${eventName}".`);
  }
}

// Función para manejar el comando 'trigger'
function triggerEventsToClients() {
  const allEvents = Object.keys(events);
  if (allEvents.length === 0) {
    console.log('No hay eventos para desencadenar.');
    return;
  }

  const message = 'Eventos disponibles: ' + allEvents.join(', ');
  broadcast(message);
}

// Función para enviar un mensaje a todos los clientes conectados
function broadcast(message) {
  server.getConnections((error, count) => {
    if (error) {
      console.error('Error al obtener las conexiones:', error);
      return;
    }

    server.clients.forEach(client => {
      client.write(message);
    });
  });
}

// Función para manejar el comando 'ask'
function listAvailableEvents() {
  const allEvents = Object.keys(events);
  if (allEvents.length === 0) {
    console.log('No hay eventos disponibles.');
    return;
  }

  console.log('Eventos disponibles:');
  allEvents.forEach(event => {
    console.log(`- ${event}`);
  });
}

function handleCommand(socket, message) {
  const parts = message.split(' ');
  const command = parts[0];
  const fileName = parts.length > 1 ? parts[1] : null;
  const eventName = parts.slice(1).join(' ');

  switch (command) {
    case 'exit':
      server.close(() => {
        console.log('Servidor terminado.');
      });
      break;
    case 'add':
      addEvent(eventName);
      break;
    case 'remove':
      delete events[eventName];
      console.log(`Evento "${eventName}" eliminado.`);
      break;
    case 'trigger':
      triggerEventsToClients();
      break;
    case 'list':
      listClients(socket, eventName);
      break;
    case 'all':
      console.log('Todos los eventos: (events)');
      console.log(events);
      console.log('Todos los eventos: (eventSubscriptions)');
      console.log(eventSubscriptions);
      break;
    case 'save':
      saveEventsToFile(fileName);
      break;
    case 'load':
      loadEventsFromFile(fileName);
      break;
    case 'sub':
      subscribe(socket, eventName);
      break;
    case 'unsub':
      unsubscribe(socket, eventName);
      break;
    case 'ask':
      listAvailableEvents();
      break;
    case 'clients':
      console.log(`Clientes conectados: ${connectedClients}`);
      break;
    case 'disconnect':
      disconnectClient(socket);
      break;
    default:
      console.log('Comando no reconocido.');
  }
}

// Monta el servidor en un hilo
server.on('connection', (socket) => {
  console.log('Cliente conectado.');
  connectedClients++;

  socket.on('data', (data) => {
    const message = data.toString().trim();
    console.log(`Mensaje del cliente: ${message}`);
    handleCommand(socket, message);
  });

  socket.on('end', () => {
    console.log('Cliente desconectado.');
    connectedClients--;
    // Eliminar al cliente de los eventos a los que estaba suscrito
    Object.keys(events).forEach(event => {
      events[event] = events[event].filter(client => client !== socket);
    });
  });
});

// Permite capturar los comandos por CMD
rl.on('line', (input) => {
  const command = input.trim();
  handleCommand(null, command);
});

// Servidor
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
