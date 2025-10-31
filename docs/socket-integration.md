# Socket Integration Notes

This document summarizes what the backend team needs to expose so the desktop client can receive live updates, and how the Electron front-end expects to consume those events.

## Backend deliverables

1. **Socket.IO server endpoint**
   - Host the Socket.IO server at `https://socket.dev-sajid.xyz` (or update `VITE_SOCKET_URL` for a different host).
   - Enable WebSocket transport; polling can stay enabled for fallbacks.
   - Namespace: default (`/`). The client subscribes to the global namespace.
   - Event name: `add_stock` with the payload shape
     ```json
     {
       "product_id": 0,
       "in_stock": 0,
       "discount_price": 0,
       "peak_hour_price": 0,
       "mediboy_offer_price": 0,
       "sync_at": "2024-01-01T00:00:00.000Z"
     }
     ```

2. **Broadcast controller/route**
   - The existing `testWebSocket` method should forward the payload to the Socket.IO server instead of calling a placeholder HTTP endpoint.
   - Recommended approach for Laravel:

     ```php
     use Illuminate\Http\Request;
     use Illuminate\Support\Facades\Http;

     public function testWebSocket(Request $request)
     {
         try {
             $payload = [
         'event' => 'add_stock',
         'data' => [
           'product_id'          => 5486,
           'in_stock'            => 10,
           'discount_price'      => 120,
           'peak_hour_price'     => 140,
           'mediboy_offer_price' => 90,
           'sync_at'             => now()->toIso8601String(),
         ],
             ];

             $response = Http::timeout(5)
                 ->connectTimeout(2)
                 ->post(config('services.socket.broadcast_url'), $payload);

             if ($response->successful()) {
                 return response()->json([
                     'message'  => 'Event has been sent!',
                     'response' => $response->json(),
                 ]);
             }

             return response()->json([
                 'message' => 'Socket server responded with an error',
                 'status'  => $response->status(),
                 'body'    => $response->body(),
             ], $response->status());
         } catch (\Throwable $e) {
             return response()->json([
                 'message' => 'An unexpected error occurred',
                 'error'   => $e->getMessage(),
             ], 500);
         }
     }
     ```

   - `services.socket.broadcast_url` should reference a lightweight Node process (see below) listening for REST broadcasts and relaying them to Socket.IO.

3. **Bridge service (Node.js example)**

   ```js
   import express from 'express'
   import http from 'http'
   import { Server } from 'socket.io'

   const app = express()
   app.use(express.json())

   const server = http.createServer(app)
   const io = new Server(server, {
     cors: { origin: '*' },
     transports: ['websocket', 'polling'],
   })

   io.on('connection', (socket) => {
     console.log('client connected', socket.id)
   })

   app.post('/broadcast', (req, res) => {
     const { event, data } = req.body

     if (!event || typeof data !== 'object') {
       return res.status(400).json({ message: 'Invalid payload' })
     }

     io.emit(event, data)
     return res.json({ message: 'Broadcast queued' })
   })

   const PORT = process.env.PORT || 3001
   server.listen(PORT, () => {
     console.log(`socket bridge listening on ${PORT}`)
   })
   ```

4. **Security considerations**
   - Protect the `/broadcast` endpoint (API key, mutual TLS, or allow-list the Laravel host).
   - If you need per-user delivery, emit to rooms keyed by user id. The current front-end listens to the broadcast event and can filter client-side.

5. **Environment variables**

- `VITE_SOCKET_URL` (front-end) should match Socket.IO server URL.
- `VITE_STOCK_BROADCAST_URL` (front-end) should target the HTTP broadcast endpoint.
- `MEDIBOY_API_BASE_URL` (Electron main process) should mirror the REST API base URL.
- `services.socket.broadcast_url` (backend) should target the Node bridge endpoint.

## Front-end expectations

- The Electron UI subscribes to `add_stock` as soon as the user logs in.
- When an event arrives, it surfaces the product, stock, and pricing snapshot in the dashboard header area.
- Connection states displayed:
  - `socket connected`
  - `socket connecting`
  - `socket offline` (on disconnect/errors)

Ensure the backend service reliably emits `sale_mode` events so operators can see live inventory notifications without reloading the application.
