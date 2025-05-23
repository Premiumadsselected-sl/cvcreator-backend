export class User {
  id: string;
  email: string;
  name?: string;
  password?: string; // Considerar si esto debe estar en la entidad o solo en DTOs/modelos internos
  roles: string[]; // o Role[] si tienes un enum/tipo Role
  createdAt: Date;
  updatedAt: Date;
  // Añade aquí otros campos relevantes de tu modelo Prisma User
}
