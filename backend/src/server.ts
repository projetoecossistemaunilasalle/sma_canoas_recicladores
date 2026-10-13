import cors from "@fastify/cors"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import websocket from "@fastify/websocket"
import { fastify } from "fastify"
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod"
import { health } from "./routes/health"
import { cooperativeRoutes } from "./routes/cooperatives/cooperative.routes"
import { userRoutes } from "./routes/users/user.routes"
import { routeRoutes } from "./routes/routes/route.routes"
import { vehicleRoutes } from "./routes/vehicles/vehicle.routes"
import { streetRoutes } from "./routes/streets/street.routes"
import { publicTrackingRoutes } from "./routes/public-tracking/public-tracking.routes"
import { announcementRoutes } from "./routes/announcements/announcement.routes"
import { wsRoutes } from "./routes/ws/ws.routes"

// The app without listen() or background jobs — index.ts runs it, and
// openapi.ts loads it just to write the OpenAPI document the frontend's API
// types are generated from.
export function buildServer() {
  // Fastify defaults to a 1MB request body cap — too small for announcements'
  // base64-encoded images (up to ~1.37MB each, up to 3 per post).
  const server = fastify({ bodyLimit: 6 * 1024 * 1024 })

  server.setValidatorCompiler(validatorCompiler)
  server.setSerializerCompiler(serializerCompiler)

  server.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({ message: "Bad Request", issues: error.validation })
    }
    console.error("Send to observability tools:", error)
    // Never send the raw error back to client as it can expose sensitive information. Always send a generic message.
    reply.status(500).send({ message: "Internal Server Error" })
  })

  server.register(swagger, {
    // 3.1 (JSON Schema 2020-12) so [lat, lng] tuples survive into the generated frontend types.
    openapi: { openapi: "3.1.0", info: { title: "Canoas Recicla API", version: "1.0.0" } },
    transform: jsonSchemaTransform,
  })
  server.register(swaggerUi, { routePrefix: "/admin/docs" })
  server.register(cors, { origin: "*" })
  server.register(websocket)

  server.register(health)
  server.register(cooperativeRoutes)
  server.register(userRoutes)
  server.register(routeRoutes)
  server.register(vehicleRoutes)
  server.register(streetRoutes)
  server.register(publicTrackingRoutes)
  server.register(announcementRoutes)
  server.register(wsRoutes)

  return server
}
