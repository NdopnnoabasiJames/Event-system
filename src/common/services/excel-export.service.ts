import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  headers?: string[];
  data: any[];
  customFormatting?: {
    headerStyle?: any;
    dataStyle?: any;
  };
}

@Injectable()
export class ExcelExportService {
  /**
   * Generic Excel export method
   */
  generateExcel(options: ExcelExportOptions): Buffer {
    const { filename, sheetName = 'Sheet1', headers, data, customFormatting } = options;

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data for Excel
    let excelData: any[][] = [];

    // Add headers if provided
    if (headers && headers.length > 0) {
      excelData.push(headers);
    }

    // Add data rows
    if (data && data.length > 0) {
      const dataRows = data.map(row => {
        if (Array.isArray(row)) {
          return row;
        }
        // If row is an object, extract values based on headers or all values
        if (headers) {
          return headers.map(header => {
            const key = header.toLowerCase().replace(/\s+/g, '');
            return this.getNestedValue(row, key) || row[header] || '';
          });
        }
        return Object.values(row);
      });
      excelData.push(...dataRows);
    }

    // Create worksheet from data
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Apply basic styling
    this.applyBasicStyling(worksheet, excelData.length, headers?.length || 0);

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Export states data
   */
  exportStates(states: any[]): Buffer {
    const headers = ['ID', 'Name', 'Code', 'Region', 'Active', 'Created Date'];
    
    const data = states.map(state => [
      state._id?.toString() || '',
      state.name || '',
      state.code || '',
      state.region || '',
      state.isActive ? 'Yes' : 'No',
      state.createdAt ? new Date(state.createdAt).toLocaleDateString() : ''
    ]);

    return this.generateExcel({
      filename: 'states_export.xlsx',
      sheetName: 'States',
      headers,
      data
    });
  }

  /**
   * Export branches data
   */
  exportBranches(branches: any[]): Buffer {
    const headers = ['ID', 'Name', 'Location', 'State', 'Active', 'Created Date'];
    
    const data = branches.map(branch => [
      branch._id?.toString() || '',
      branch.name || '',
      branch.location || '',
      branch.stateId?.name || branch.state?.name || '',
      branch.isActive ? 'Yes' : 'No',
      branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : ''
    ]);

    return this.generateExcel({
      filename: 'branches_export.xlsx',
      sheetName: 'Branches',
      headers,
      data
    });
  }

  /**
   * Export zones data
   */
  exportZones(zones: any[]): Buffer {
    const headers = ['ID', 'Name', 'Branch', 'State', 'Active', 'Created Date'];
    
    const data = zones.map(zone => [
      zone._id?.toString() || '',
      zone.name || '',
      zone.branchId?.name || zone.branch?.name || '',
      zone.branchId?.stateId?.name || zone.branch?.state?.name || '',
      zone.isActive ? 'Yes' : 'No',
      zone.createdAt ? new Date(zone.createdAt).toLocaleDateString() : ''
    ]);

    return this.generateExcel({
      filename: 'zones_export.xlsx',
      sheetName: 'Zones',
      headers,
      data
    });
  }

  /**
   * Export events data
   */
  exportEvents(events: any[]): Buffer {
    const headers = [
      'ID', 'Title', 'Description', 'Date', 'Venue', 'Capacity',
      'Current Count', 'Status', 'Creator', 'Created Date'
    ];
    
    const data = events.map(event => [
      event._id?.toString() || '',
      event.title || '',
      event.description || '',
      event.date ? new Date(event.date).toLocaleDateString() : '',
      event.venue || '',
      event.capacity || 0,
      event.currentCount || 0,
      event.status || '',
      event.createdBy?.name || '',
      event.createdAt ? new Date(event.createdAt).toLocaleDateString() : ''
    ]);

    return this.generateExcel({
      filename: 'events_export.xlsx',
      sheetName: 'Events',
      headers,
      data
    });
  }

  /**
   * Export admins/users data
   */
  exportAdmins(admins: any[]): Buffer {
    const headers = [
      'ID', 'Name', 'Email', 'Role', 'State', 'Branch', 'Zone',
      'Active', 'Last Login', 'Created Date'
    ];
    
    const data = admins.map(admin => [
      admin._id?.toString() || '',
      admin.name || '',
      admin.email || '',
      admin.role || '',
      admin.state?.name || '',
      admin.branch?.name || '',
      admin.zone?.name || '',
      admin.isActive ? 'Yes' : 'No',
      admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : '',
      admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : ''
    ]);

    return this.generateExcel({
      filename: 'admins_export.xlsx',
      sheetName: 'Admins',
      headers,
      data
    });
  }

  /**
   * Export pickup stations data
   */
  exportPickupStations(stations: any[]): Buffer {
    const headers = [
      'ID', 'Location', 'Branch', 'Zone', 'Capacity', 
      'Active', 'Created Date'
    ];
    
    const data = stations.map(station => [
      station._id?.toString() || '',
      station.location || '',
      station.branchId?.name || station.branch?.name || '',
      station.zoneId?.name || station.zone?.name || '',
      station.capacity || 0,
      station.isActive ? 'Yes' : 'No',
      station.createdAt ? new Date(station.createdAt).toLocaleDateString() : ''
    ]);

    return this.generateExcel({
      filename: 'pickup_stations_export.xlsx',
      sheetName: 'Pickup Stations',
      headers,
      data
    });
  }

  /**
   * Helper method to get nested object values
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Apply basic styling to worksheet
   */
  private applyBasicStyling(worksheet: XLSX.WorkSheet, rowCount: number, colCount: number): void {
    // Set column widths
    const colWidths = Array(colCount).fill(0).map(() => ({ wch: 15 }));
    worksheet['!cols'] = colWidths;

    // Set row heights for header
    if (rowCount > 0) {
      worksheet['!rows'] = [{ hpt: 20 }]; // Header row height
    }
  }
}
