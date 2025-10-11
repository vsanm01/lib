/**
 * GS Data Mapper - Google Sheets Data Mapping Library
 * Version: 1.0.0
 * A utility library for converting Google Sheets data to JavaScript objects
 * with automatic type detection and conversion.
 */

(function(global) {
  'use strict';

  /**
   * Maps a row of data to a JavaScript object using headers as keys
   * @param {Array} row - Array of cell values from a sheet row
   * @param {Array} headers - Array of header names
   * @returns {Object} Mapped object with camelCase keys and parsed values
   */
  function mapRowToObject(row, headers) {
    const obj = {};
    
    headers.forEach((header, index) => {
      const value = row[index];
      
      // Clean header name (remove spaces, make camelCase)
      const key = header
        .toString()
        .trim()
        .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
        .replace(/\s/g, '')
        .replace(/^(.)/, (_, char) => char.toLowerCase());
      
      // Auto-detect and convert data types
      obj[key] = parseValue(value);
    });
    
    return obj;
  }

  /**
   * Maps multiple rows to an array of objects
   * @param {Array} rows - Array of rows (each row is an array of values)
   * @param {Array} headers - Array of header names
   * @returns {Array} Array of mapped objects
   */
  function mapRowsToObjects(rows, headers) {
    return rows.map(row => mapRowToObject(row, headers));
  }

  /**
   * Maps a complete sheet (including header row) to an array of objects
   * @param {Array} sheet - 2D array where first row contains headers
   * @returns {Array} Array of mapped objects
   */
  function mapSheetToObjects(sheet) {
    if (!sheet || sheet.length === 0) {
      return [];
    }
    
    const [headers, ...rows] = sheet;
    return mapRowsToObjects(rows, headers);
  }

  /**
   * Auto-detects and parses values to appropriate data types
   * @param {*} value - The value to parse
   * @returns {*} Parsed value (string, number, boolean, or empty string)
   */
  function parseValue(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    
    const str = value.toString().trim();
    
    // Check if it's a number
    if (!isNaN(str) && str !== '') {
      const num = parseFloat(str);
      return Number.isInteger(num) ? parseInt(str) : num;
    }
    
    // Check if it's a boolean
    if (str.toLowerCase() === 'true') return true;
    if (str.toLowerCase() === 'false') return false;
    
    // Return as string
    return str;
  }

  /**
   * Converts a header string to camelCase format
   * @param {string} header - Header string to convert
   * @returns {string} camelCase formatted string
   */
  function toCamelCase(header) {
    return header
      .toString()
      .trim()
      .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
      .replace(/\s/g, '')
      .replace(/^(.)/, (_, char) => char.toLowerCase());
  }

  // Create the main GSDataMapper object
  const GSDataMapper = {
    mapRowToObject,
    mapRowsToObjects,
    mapSheetToObjects,
    parseValue,
    toCamelCase,
    version: '1.0.0'
  };

  // Export for different module systems
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = GSDataMapper;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return GSDataMapper;
    });
  } else {
    global.GSDataMapper = GSDataMapper;
  }

})(typeof window !== 'undefined' ? window : this);
