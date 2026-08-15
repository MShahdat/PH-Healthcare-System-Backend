import { Role } from "../../../generated/prisma/enums"
import config from "../config/env"
import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"

export const seedSuperAdmin = async () => {
  try {
    const existSuperAdmin = await prisma.user.findFirst({
      where: {role: "SUPER_ADMIN"}
    })

    if(existSuperAdmin){
      console.log('super admin already exists')
      return;
    }

    const name = config.super_admin_name
    const email = config.super_admin_email
    const password = config.super_admin_password

    if(!name || !email || !password){
      throw new Error('no super admin name, email, password')
    }

    const hasPass = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds))

    const superAdmi = await prisma.user.create({
      data: {
        name,
        email,
        password: hasPass,
        emailVerified: true,
        needPasswordChange: false,
        role: Role.SUPER_ADMIN,
      }
    })

    console.log('super admin created', superAdmi)

  } catch (error) {
    console.log('error', error)
    await prisma.user.delete({
      where: {email: config.super_admin_email}
    })
  }
}