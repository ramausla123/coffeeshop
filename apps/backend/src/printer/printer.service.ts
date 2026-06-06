import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as escpos from 'escpos';
import { Order } from '../orders/entities/order.entity';

interface PrinterConfig {
  type: 'usb' | 'serial' | 'network';
  path?: string; // for serial
  host?: string; // for network
  port?: number; // for network
}

@Injectable()
export class PrinterService implements OnModuleInit {
  private readonly logger = new Logger(PrinterService.name);
  private printer: any = null;
  private printerConfig: PrinterConfig | null = null;
  private isReady = false;

  onModuleInit() {
    // Initialize printer if env variables are set
    const printerType = process.env.PRINTER_TYPE as 'usb' | 'serial' | 'network' | undefined;
    if (printerType === 'serial' && process.env.PRINTER_PORT) {
      this.initSerialPrinter(process.env.PRINTER_PORT);
    } else if (printerType === 'network' && process.env.PRINTER_HOST) {
      this.initNetworkPrinter(process.env.PRINTER_HOST, parseInt(process.env.PRINTER_PORT || '9100'));
    }
  }

  private initSerialPrinter(port: string) {
    try {
      const device = new (escpos as any).Serial(port, { autoOpen: true });
      this.printer = new (escpos as any).Printer(device);
      this.printerConfig = { type: 'serial', path: port };
      this.isReady = true;
      this.logger.log(`Printer connected via serial port: ${port}`);
    } catch (err) {
      this.logger.warn(`Failed to connect to serial printer: ${err}`);
    }
  }

  private initNetworkPrinter(host: string, port: number) {
    try {
      const device = new (escpos as any).Network(host, port);
      this.printer = new (escpos as any).Printer(device);
      this.printerConfig = { type: 'network', host, port };
      this.isReady = true;
      this.logger.log(`Printer connected via network: ${host}:${port}`);
    } catch (err) {
      this.logger.warn(`Failed to connect to network printer: ${err}`);
    }
  }

  async printReceipt(order: Order, paidAmount: number, changeAmount: number): Promise<boolean> {
    if (!this.isReady || !this.printer) {
      this.logger.warn('Printer is not connected. Skipping print.');
      return false;
    }

    try {
      const itemsText = order.items
        .map((item: any) => `${item.name || 'Item'} x${item.quantity}`)
        .join('\n');

      this.printer
        .align('center')
        .style('b')
        .font('a')
        .size(2, 2)
        .text('COFFEE SHOP')
        .text('RECEIPT')
        .size(1, 1)
        .style('normal')
        .text('-----------------------------------')
        .align('left')
        .text(`Order #${order.id}`)
        .text(`Table: ${order.table || '-'}`)
        .text(`Date: ${new Date().toLocaleString('id-ID')}`)
        .text('-----------------------------------')
        .style('b')
        .text('ITEMS:')
        .style('normal')
        .text(itemsText)
        .text('-----------------------------------')
        .align('right')
        .style('b')
        .text(`Total    : Rp ${order.total.toLocaleString('id-ID')}`)
        .text(`Paid     : Rp ${paidAmount.toLocaleString('id-ID')}`)
        .text(`Change   : Rp ${changeAmount.toLocaleString('id-ID')}`)
        .style('normal')
        .text('-----------------------------------')
        .align('center')
        .text('Thank you!')
        .text('Terima kasih!')
        .feed(3)
        .cut()
        .close();

      this.logger.log(`Receipt printed for order #${order.id}`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to print receipt: ${err}`);
      return false;
    }
  }

  getStatus(): { isConnected: boolean; config: PrinterConfig | null } {
    return {
      isConnected: this.isReady,
      config: this.printerConfig,
    };
  }
}
