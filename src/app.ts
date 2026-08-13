import express, { Application, Request, Response } from "express"
import config from "./app/config/env"
import cors from 'cors'
import cookieParser from "cookie-parser"
import { globalErrorHandler } from "./app/middleware/globalErrorHandler"
import { notFound } from "./app/middleware/notFound"
import { AuthRoutes } from "./app/module/auth/auth.route"

const app: Application = express()

app.use(
  cors({
    origin: config.frontend_url,
    credentials: true
  })
)


app.use(express.urlencoded({ extended: true }))


app.use(express.json())
app.use(cookieParser())


app.get('/', async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to PH Healthcase System Backend'
  })
})


app.use('/api/v1/auth', AuthRoutes)

app.use(globalErrorHandler)
app.use(notFound)



export default app