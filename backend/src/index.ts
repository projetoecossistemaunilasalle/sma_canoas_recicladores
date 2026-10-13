import { buildServer } from "./server"
import { startMultiportalSync } from "./integrations/multiportal-sync"
import { startProximityNotifier } from "./integrations/proximity-notifier"

const server = buildServer()
const port = Number(process.env.PORT) || 3333

server.listen({ port, host: "0.0.0.0" }).then(() => {
  console.log(`Server is running on http://localhost:${port}`)
  startMultiportalSync()
  startProximityNotifier()
})
