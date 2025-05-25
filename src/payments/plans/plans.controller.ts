import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { PlansService } from "./plans.service";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Role } from "../../auth/enums/role.enum";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";

@ApiTags("Plans")
@Controller("payments/plans") // Ruta base ajustada a payments/plans
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Endpoint público para que los usuarios vean los planes activos
  @Get("active")
  @ApiOperation({ summary: "Get all active plans" })
  findAllActive() {
    return this.plansService.findAllActive();
  }

  // Endpoints de Admin
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new plan (Admin only)" })
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all plans (Admin only)" })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  findAll(
    @Query("skip", new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query("take", new DefaultValuePipe(10), ParseIntPipe) take?: number
  ) {
    // Aquí podrías añadir más parámetros de consulta para filtrado y ordenación si es necesario
    return this.plansService.findAll({ skip, take });
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a specific plan by ID (Admin only)" })
  findOne(@Param("id") id: string) {
    return this.plansService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a plan (Admin only)" })
  update(@Param("id") id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.plansService.update(id, updatePlanDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a plan (Admin only) - Soft delete" })
  remove(@Param("id") id: string) {
    return this.plansService.remove(id);
  }
}
