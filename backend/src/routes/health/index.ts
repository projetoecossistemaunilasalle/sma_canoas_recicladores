import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import {z} from "zod"

export const health: FastifyPluginAsyncZod = async (server) => {
	server.get(
		"/health",
		{
			schema: {
				summary: "Health check",
				description: "Endpoint to check the health of the application",
				tags: ["Health"],
				response: {
					200: z.object({
						healthy: z.boolean(),
					}),
				},
			},
		},
		async (_, reply) => {
			reply.status(200).send({ healthy: true })
		}
	)
}