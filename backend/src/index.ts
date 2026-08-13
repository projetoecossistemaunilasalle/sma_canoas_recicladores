import cors from '@fastify/cors'
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import { fastify } from "fastify"
import {
	hasZodFastifySchemaValidationErrors,
	serializerCompiler,
	validatorCompiler,
} from "fastify-type-provider-zod"
import { health } from "./routes/health"
import { cooperativeRoutes } from './routes/cooperatives/cooperative.routes'
import { userRoutes } from './routes/users/user.routes'
import { routeRoutes } from './routes/routes/route.routes'
import { vehicleRoutes } from './routes/vehicles/vehicle.routes'
import { streetRoutes } from './routes/streets/street.routes'


const server = fastify()

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)
  
server.setErrorHandler((error, _request, reply) => {
	if (hasZodFastifySchemaValidationErrors(error)) {
		return reply
			.status(400)
			.send({ message: "Bad Request", issues: error.validation })
	}
	console.error("Send to observability tools:", error)
	// Never send the raw error back to client as it can expose sensitive information. Always send a generic message.
	reply.status(500).send({ message: "Internal Server Error" })
})

server.register(swagger, {
	openapi: { info: { title: "Upload Widget API", version: "1.0.0" } },
})
server.register(swaggerUi, {
	routePrefix: "/admin/docs",
})

server.register(cors, {
	origin: "*",
})


server.register(health)
server.register(cooperativeRoutes)
server.register(userRoutes)
server.register(routeRoutes)
server.register(vehicleRoutes)
server.register(streetRoutes)

const port = Number(process.env.PORT) || 3333

server.listen({ port, host: "0.0.0.0" }).then(() => {
	console.log(`Server is running on http://localhost:${port}`)
})