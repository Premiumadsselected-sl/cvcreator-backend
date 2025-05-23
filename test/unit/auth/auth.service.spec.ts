import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../../../src/auth/auth.service";
import { UsersService } from "../../../src/users/users.service";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../../src/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { AuditLogsService } from "../../../src/audit-logs/audit-logs.service";
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { RegisterUserDto } from "../../../src/auth/dto/register-user.dto";
import { LoginUserDto } from "../../../src/auth/dto/login-user.dto";
import { UserDto } from "../../../src/users/dto/user.dto";

// Mock de bcrypt
jest.mock("bcrypt");

// Mock de AuditLogsService
const mockAuditLogsService = {
  create: jest.fn(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockPrismaService = {
  // PrismaService no se usa directamente en AuthService, sino a través de UsersService.
  // Si UsersService está bien mockeado, no necesitamos mockear PrismaService aquí directamente
  // para los métodos actuales de AuthService.
};

describe("AuthService", () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  // Añadir AuditLogsService al scope del describe
  let auditLogsService: AuditLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService }, // Aunque no se use directamente
        { provide: AuditLogsService, useValue: mockAuditLogsService }, // Añadir AuditLogsService mockeado
        // ConfigService es una dependencia de JwtModule, que AuthService usa indirectamente.
        // Sin embargo, para las pruebas unitarias de AuthService, mockeamos JwtService directamente,
        // por lo que no necesitamos mockear ConfigService aquí.
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService); // Obtener la instancia mockeada

    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // Pruebas para el método register
  describe("register", () => {
    const registerUserDto: RegisterUserDto = {
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
      username: "testuser", // Añadir username aquí
    };
    const hashedPassword = "hashedPassword";
    const mockUser = {
      id: "1",
      email: registerUserDto.email,
      password: hashedPassword,
      firstName: registerUserDto.firstName,
      lastName: registerUserDto.lastName,
      status: "active", // Usar string literal
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1,
      // ...otros campos si los hay
    };
    const mockToken = "mockAccessToken";

    it("should register a new user and return an access token and user data", async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.register(registerUserDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerUserDto.email
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(registerUserDto.password, 10);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: registerUserDto.email,
        password: hashedPassword, // La contraseña hasheada
        user_name: registerUserDto.username, // AuthService pasa el username del DTO, que es 'testuser' en este mock
        user_data: {
          // Asumiendo que firstName y lastName están dentro de user_data en el DTO o se construyen así
          firstName: registerUserDto.firstName,
          lastName: registerUserDto.lastName,
        },
        // Asegúrate de que todos los campos esperados por UsersService.create estén aquí
        // y que coincidan con cómo AuthService.register los prepara.
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUserPayload } = mockUser;
      expect(result).toEqual({
        accessToken: mockToken,
        user: expectedUserPayload as UserDto,
      });
    });

    it("should throw ConflictException if user already exists", async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      await expect(service.register(registerUserDto)).rejects.toThrow(
        ConflictException
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerUserDto.email
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  // Pruebas para el método login
  describe("login", () => {
    const loginUserDto: LoginUserDto = {
      email: "test@example.com",
      password: "password123",
    };
    const mockUser = {
      id: "1",
      email: loginUserDto.email,
      password: "hashedPassword",
      firstName: "Test",
      lastName: "User",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1,
    };
    const mockToken = "mockAccessToken";

    it("should login an existing user and return an access token and user data", async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login(loginUserDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        loginUserDto.email
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        mockUser.password
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUserPayload } = mockUser;
      expect(result).toEqual({
        accessToken: mockToken,
        user: expectedUserPayload as UserDto,
      });
    });

    it("should throw UnauthorizedException if user not found", async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        loginUserDto.email
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if password does not match", async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        mockUser.password
      );
    });

    it("should throw UnauthorizedException if user status is inactive", async () => {
      const inactiveUser = { ...mockUser, status: "inactive" }; // Usar string literal
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        loginUserDto.email
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        inactiveUser.password
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if user status is pending_verification", async () => {
      const pendingUser = {
        ...mockUser,
        status: "pending_verification", // Usar string literal
      };
      mockUsersService.findByEmail.mockResolvedValue(pendingUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        loginUserDto.email
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginUserDto.password,
        pendingUser.password
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  // Pruebas para el método validateUserById
  describe("validateUserById", () => {
    const userId = "1";
    const mockUser = {
      id: userId,
      email: "test@example.com",
      password: "hashedPassword",
    };

    it("should return user if found", async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      const result = await service.validateUserById(userId);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });

    it("should throw NotFoundException if user not found", async () => {
      mockUsersService.findOne.mockResolvedValue(null);
      await expect(service.validateUserById(userId)).rejects.toThrow(
        NotFoundException
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  // Pruebas para el método getProfile
  describe("getProfile", () => {
    const userId = "1";
    const mockUserWithPassword = {
      id: userId,
      email: "test@example.com",
      password: "hashedPassword",
      firstName: "Test",
      lastName: "User",
      status: "active", // Usar string literal
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      version: 1,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...mockUserProfile } = mockUserWithPassword;

    it("should return user profile if user found", async () => {
      mockUsersService.findOne.mockResolvedValue(mockUserWithPassword);
      const result = await service.getProfile(userId);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUserProfile);
    });

    it("should throw NotFoundException if user not found for profile", async () => {
      mockUsersService.findOne.mockResolvedValue(null);
      await expect(service.getProfile(userId)).rejects.toThrow(
        NotFoundException
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
    });
  });
});
