import { Injectable, Logger } from "@nestjs/common";
import { IPaymentProcessor } from "./processors/payment-processor.interface";

@Injectable()
export class PaymentProcessorRegistryService {
  private readonly logger = new Logger(PaymentProcessorRegistryService.name);
  private processors = new Map<string, IPaymentProcessor>();

  register(processorName: string, processor: IPaymentProcessor) {
    if (this.processors.has(processorName)) {
      this.logger.warn(
        `Payment processor with name ${processorName} is already registered. Overwriting.`
      );
    }
    this.processors.set(processorName, processor);
    this.logger.log(`Registered payment processor: ${processorName}`);
  }

  getProcessor(processorName: string): IPaymentProcessor | null {
    const processor = this.processors.get(processorName);
    if (!processor) {
      this.logger.warn(
        `Payment processor ${processorName} not found or not registered.`
      );
      return null;
    }
    return processor;
  }

  getAllProcessors(): Map<string, IPaymentProcessor> {
    return this.processors;
  }
}
