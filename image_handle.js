/**
 * ========================================
 * UNIVERSAL PRODUCT VALIDATOR CDN
 * ========================================
 * Standalone library for validating and filtering product data
 * Supports: Custom rules, Batch validation, Flexible configuration
 * 
 * @version 1.0.0
 * @author Your Name
 * @license MIT
 */

(function(window) {
    'use strict';

    // ==========================================
    // MAIN PRODUCT VALIDATOR CLASS
    // ==========================================
    const UniversalProductValidator = {
        version: '1.0.0',
        
        // Default validation rules
        config: {
            requiredFields: ['name', 'price', 'category'],
            optionalFields: ['id', 'image', 'description', 'stock', 'sku'],
            
            // Field-specific rules
            rules: {
                name: {
                    minLength: 1,
                    maxLength: 200,
                    allowEmpty: false,
                    trim: true
                },
                price: {
                    min: 0,
                    max: Infinity,
                    allowZero: false,
                    allowNegative: false,
                    isNumeric: true
                },
                category: {
                    minLength: 1,
                    maxLength: 100,
                    allowEmpty: false,
                    trim: true
                },
                id: {
                    isNumeric: false,
                    allowEmpty: true
                },
                stock: {
                    min: 0,
                    isNumeric: true,
                    allowZero: true
                },
                description: {
                    maxLength: 1000,
                    allowEmpty: true
                }
            },
            
            // Behavior settings
            behavior: {
                strictMode: false,        // Fail on any validation error
                autoTrim: true,           // Auto-trim string fields
                autoConvert: true,        // Auto-convert types (string to number)
                removeInvalid: true,      // Remove invalid products from array
                logErrors: true,          // Log validation errors
                throwErrors: false        // Throw errors instead of logging
            }
        },

        // ==========================================
        // SINGLE PRODUCT VALIDATION
        // ==========================================

        /**
         * Validate a single product
         * @param {object} product - Product object to validate
         * @param {object} options - Validation options (override defaults)
         * @returns {object} { isValid: boolean, errors: array, product: object }
         */
        validate(product, options = {}) {
            const opts = { ...this.config, ...options };
            const errors = [];
            const validatedProduct = { ...product };

            try {
                // Check if product is an object
                if (!this._isObject(product)) {
                    errors.push('Product must be an object');
                    return this._buildResult(false, errors, product);
                }

                // Validate required fields
                const requiredFieldErrors = this._validateRequiredFields(validatedProduct, opts);
                errors.push(...requiredFieldErrors);

                // Validate each field against rules
                const fieldErrors = this._validateFields(validatedProduct, opts);
                errors.push(...fieldErrors);

                // Handle errors based on configuration
                if (errors.length > 0) {
                    this._handleErrors(errors, opts.behavior);
                    return this._buildResult(false, errors, validatedProduct);
                }

                return this._buildResult(true, [], validatedProduct);

            } catch (error) {
                errors.push(`Validation error: ${error.message}`);
                this._handleErrors(errors, opts.behavior);
                return this._buildResult(false, errors, product);
            }
        },

        /**
         * Check if product is valid (simple boolean check)
         * @param {object} product - Product to validate
         * @param {object} options - Validation options
         * @returns {boolean}
         */
        isValid(product, options = {}) {
            const result = this.validate(product, options);
            return result.isValid;
        },

        // ==========================================
        // BATCH VALIDATION & FILTERING
        // ==========================================

        /**
         * Validate multiple products
         * @param {array} products - Array of products
         * @param {object} options - Validation options
         * @returns {object} { valid: array, invalid: array, stats: object }
         */
        validateBatch(products, options = {}) {
            if (!Array.isArray(products)) {
                this._log('validateBatch requires an array');
                return { valid: [], invalid: [], stats: { total: 0, valid: 0, invalid: 0 } };
            }

            const valid = [];
            const invalid = [];

            products.forEach((product, index) => {
                const result = this.validate(product, options);
                
                if (result.isValid) {
                    valid.push(result.product);
                } else {
                    invalid.push({
                        index: index,
                        product: product,
                        errors: result.errors
                    });
                }
            });

            const stats = {
                total: products.length,
                valid: valid.length,
                invalid: invalid.length,
                successRate: products.length > 0 ? (valid.length / products.length * 100).toFixed(2) + '%' : '0%'
            };

            this._log(`Batch validation complete: ${stats.valid}/${stats.total} valid (${stats.successRate})`);

            return { valid, invalid, stats };
        },

        /**
         * Filter valid products from array
         * @param {array} products - Array of products
         * @param {object} options - Validation options
         * @returns {array} Array of valid products only
         */
        filter(products, options = {}) {
            if (!Array.isArray(products)) {
                console.error('filter() requires an array');
                return [];
            }

            return products.filter(product => this.isValid(product, options));
        },

        /**
         * Get invalid products from array
         * @param {array} products - Array of products
         * @param {object} options - Validation options
         * @returns {array} Array of invalid products with errors
         */
        getInvalid(products, options = {}) {
            const result = this.validateBatch(products, options);
            return result.invalid;
        },

        // ==========================================
        // FIELD-SPECIFIC VALIDATION
        // ==========================================

        /**
         * Validate product name
         * @param {string} name - Product name
         * @param {object} rules - Validation rules
         * @returns {object} { isValid: boolean, error: string|null }
         */
        validateName(name, rules = null) {
            const nameRules = rules || this.config.rules.name;
            const errors = [];

            if (!nameRules.allowEmpty && (!name || name.trim() === '')) {
                return { isValid: false, error: 'Name is required' };
            }

            const trimmedName = nameRules.trim ? name.trim() : name;

            if (trimmedName.length < nameRules.minLength) {
                errors.push(`Name must be at least ${nameRules.minLength} characters`);
            }

            if (trimmedName.length > nameRules.maxLength) {
                errors.push(`Name must not exceed ${nameRules.maxLength} characters`);
            }

            return errors.length === 0 
                ? { isValid: true, error: null, value: trimmedName }
                : { isValid: false, error: errors.join(', ') };
        },

        /**
         * Validate product price
         * @param {number|string} price - Product price
         * @param {object} rules - Validation rules
         * @returns {object} { isValid: boolean, error: string|null }
         */
        validatePrice(price, rules = null) {
            const priceRules = rules || this.config.rules.price;
            
            // Convert to number if needed
            const numPrice = typeof price === 'string' ? parseFloat(price) : price;

            // Check if numeric
            if (isNaN(numPrice)) {
                return { isValid: false, error: 'Price must be a valid number' };
            }

            // Check negative
            if (!priceRules.allowNegative && numPrice < 0) {
                return { isValid: false, error: 'Price cannot be negative' };
            }

            // Check zero
            if (!priceRules.allowZero && numPrice === 0) {
                return { isValid: false, error: 'Price must be greater than zero' };
            }

            // Check min/max
            if (numPrice < priceRules.min) {
                return { isValid: false, error: `Price must be at least ${priceRules.min}` };
            }

            if (numPrice > priceRules.max) {
                return { isValid: false, error: `Price must not exceed ${priceRules.max}` };
            }

            return { isValid: true, error: null, value: numPrice };
        },

        /**
         * Validate product category
         * @param {string} category - Product category
         * @param {object} rules - Validation rules
         * @returns {object} { isValid: boolean, error: string|null }
         */
        validateCategory(category, rules = null) {
            const catRules = rules || this.config.rules.category;
            
            if (!catRules.allowEmpty && (!category || category.trim() === '')) {
                return { isValid: false, error: 'Category is required' };
            }

            const trimmedCategory = catRules.trim ? category.trim() : category;

            if (trimmedCategory.length < catRules.minLength) {
                return { isValid: false, error: `Category must be at least ${catRules.minLength} characters` };
            }

            if (trimmedCategory.length > catRules.maxLength) {
                return { isValid: false, error: `Category must not exceed ${catRules.maxLength} characters` };
            }

            return { isValid: true, error: null, value: trimmedCategory };
        },

        /**
         * Validate stock quantity
         * @param {number|string} stock - Stock quantity
         * @param {object} rules - Validation rules
         * @returns {object} { isValid: boolean, error: string|null }
         */
        validateStock(stock, rules = null) {
            const stockRules = rules || this.config.rules.stock;
            
            // Convert to number
            const numStock = typeof stock === 'string' ? parseInt(stock) : stock;

            if (isNaN(numStock)) {
                return { isValid: false, error: 'Stock must be a valid number' };
            }

            if (!stockRules.allowZero && numStock === 0) {
                return { isValid: false, error: 'Stock must be greater than zero' };
            }

            if (numStock < stockRules.min) {
                return { isValid: false, error: `Stock must be at least ${stockRules.min}` };
            }

            return { isValid: true, error: null, value: numStock };
        },

        // ==========================================
        // CUSTOM VALIDATION RULES
        // ==========================================

        /**
         * Add custom validation rule
         * @param {string} fieldName - Field to validate
         * @param {function} validator - Validation function (product, fieldValue) => { isValid, error }
         */
        addCustomRule(fieldName, validator) {
            if (typeof validator !== 'function') {
                console.error('Validator must be a function');
                return;
            }

            if (!this.config.customRules) {
                this.config.customRules = {};
            }

            this.config.customRules[fieldName] = validator;
            this._log(`Custom rule added for field: ${fieldName}`);
        },

        /**
         * Remove custom validation rule
         * @param {string} fieldName - Field name
         */
        removeCustomRule(fieldName) {
            if (this.config.customRules && this.config.customRules[fieldName]) {
                delete this.config.customRules[fieldName];
                this._log(`Custom rule removed for field: ${fieldName}`);
            }
        },

        // ==========================================
        // SANITIZATION
        // ==========================================

        /**
         * Sanitize product data (trim, convert types, etc.)
         * @param {object} product - Product to sanitize
         * @param {object} options - Sanitization options
         * @returns {object} Sanitized product
         */
        sanitize(product, options = {}) {
            const opts = { ...this.config.behavior, ...options };
            const sanitized = { ...product };

            try {
                // Auto-trim string fields
                if (opts.autoTrim) {
                    Object.keys(sanitized).forEach(key => {
                        if (typeof sanitized[key] === 'string') {
                            sanitized[key] = sanitized[key].trim();
                        }
                    });
                }

                // Auto-convert types
                if (opts.autoConvert) {
                    // Convert price to number
                    if (sanitized.price && typeof sanitized.price === 'string') {
                        sanitized.price = parseFloat(sanitized.price);
                    }

                    // Convert stock to number
                    if (sanitized.stock && typeof sanitized.stock === 'string') {
                        sanitized.stock = parseInt(sanitized.stock);
                    }

                    // Convert id to number if numeric
                    if (sanitized.id && typeof sanitized.id === 'string' && !isNaN(sanitized.id)) {
                        sanitized.id = parseInt(sanitized.id);
                    }
                }

                return sanitized;

            } catch (error) {
                console.error('Sanitization error:', error);
                return product;
            }
        },

        /**
         * Sanitize array of products
         * @param {array} products - Products to sanitize
         * @param {object} options - Sanitization options
         * @returns {array} Sanitized products
         */
        sanitizeBatch(products, options = {}) {
            if (!Array.isArray(products)) {
                console.error('sanitizeBatch requires an array');
                return [];
            }

            return products.map(product => this.sanitize(product, options));
        },

        // ==========================================
        // CONFIGURATION METHODS
        // ==========================================

        /**
         * Update configuration
         * @param {object} newConfig - New configuration
         */
        configure(newConfig) {
            this.config = this._deepMerge(this.config, newConfig);
            this._log('Configuration updated');
        },

        /**
         * Add required field
         * @param {string} fieldName - Field to require
         */
        addRequiredField(fieldName) {
            if (!this.config.requiredFields.includes(fieldName)) {
                this.config.requiredFields.push(fieldName);
                this._log(`Required field added: ${fieldName}`);
            }
        },

        /**
         * Remove required field
         * @param {string} fieldName - Field to remove
         */
        removeRequiredField(fieldName) {
            this.config.requiredFields = this.config.requiredFields.filter(f => f !== fieldName);
            this._log(`Required field removed: ${fieldName}`);
        },

        /**
         * Get current configuration
         * @returns {object} Current config
         */
        getConfig() {
            return JSON.parse(JSON.stringify(this.config));
        },

        /**
         * Reset to default configuration
         */
        resetConfig() {
            this.config = this._getDefaultConfig();
            this._log('Configuration reset to defaults');
        },

        // ==========================================
        // STATISTICS & REPORTING
        // ==========================================

        /**
         * Get validation statistics for products
         * @param {array} products - Products to analyze
         * @returns {object} Statistics object
         */
        getStats(products) {
            if (!Array.isArray(products)) {
                return null;
            }

            const result = this.validateBatch(products);
            
            // Analyze common errors
            const errorFrequency = {};
            result.invalid.forEach(item => {
                item.errors.forEach(error => {
                    errorFrequency[error] = (errorFrequency[error] || 0) + 1;
                });
            });

            return {
                total: result.stats.total,
                valid: result.stats.valid,
                invalid: result.stats.invalid,
                successRate: result.stats.successRate,
                commonErrors: Object.entries(errorFrequency)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([error, count]) => ({ error, count }))
            };
        },

        // ==========================================
        // PRIVATE HELPER METHODS
        // ==========================================

        /**
         * Validate required fields exist
         * @private
         */
        _validateRequiredFields(product, options) {
            const errors = [];
            
            options.requiredFields.forEach(field => {
                if (!product.hasOwnProperty(field) || product[field] === null || product[field] === undefined) {
                    errors.push(`Missing required field: ${field}`);
                }
            });

            return errors;
        },

        /**
         * Validate all fields against rules
         * @private
         */
        _validateFields(product, options) {
            const errors = [];

            // Validate name
            if (product.name !== undefined) {
                const nameResult = this.validateName(product.name, options.rules.name);
                if (!nameResult.isValid) {
                    errors.push(`Name: ${nameResult.error}`);
                } else if (options.behavior.autoTrim) {
                    product.name = nameResult.value;
                }
            }

            // Validate price
            if (product.price !== undefined) {
                const priceResult = this.validatePrice(product.price, options.rules.price);
                if (!priceResult.isValid) {
                    errors.push(`Price: ${priceResult.error}`);
                } else if (options.behavior.autoConvert) {
                    product.price = priceResult.value;
                }
            }

            // Validate category
            if (product.category !== undefined) {
                const catResult = this.validateCategory(product.category, options.rules.category);
                if (!catResult.isValid) {
                    errors.push(`Category: ${catResult.error}`);
                } else if (options.behavior.autoTrim) {
                    product.category = catResult.value;
                }
            }

            // Validate stock (if present)
            if (product.stock !== undefined) {
                const stockResult = this.validateStock(product.stock, options.rules.stock);
                if (!stockResult.isValid) {
                    errors.push(`Stock: ${stockResult.error}`);
                } else if (options.behavior.autoConvert) {
                    product.stock = stockResult.value;
                }
            }

            // Run custom rules
            if (options.customRules) {
                Object.keys(options.customRules).forEach(fieldName => {
                    if (product[fieldName] !== undefined) {
                        const result = options.customRules[fieldName](product, product[fieldName]);
                        if (result && !result.isValid) {
                            errors.push(`${fieldName}: ${result.error}`);
                        }
                    }
                });
            }

            return errors;
        },

        /**
         * Build validation result object
         * @private
         */
        _buildResult(isValid, errors, product) {
            return {
                isValid,
                errors,
                product,
                errorCount: errors.length
            };
        },

        /**
         * Handle errors based on behavior config
         * @private
         */
        _handleErrors(errors, behavior) {
            if (behavior.throwErrors) {
                throw new Error(errors.join('; '));
            }
            
            if (behavior.logErrors) {
                errors.forEach(error => console.error('[ProductValidator]', error));
            }
        },

        /**
         * Check if value is an object
         * @private
         */
        _isObject(value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value);
        },

        /**
         * Deep merge objects
         * @private
         */
        _deepMerge(target, source) {
            const output = { ...target };
            
            if (this._isObject(target) && this._isObject(source)) {
                Object.keys(source).forEach(key => {
                    if (this._isObject(source[key])) {
                        if (!(key in target)) {
                            output[key] = source[key];
                        } else {
                            output[key] = this._deepMerge(target[key], source[key]);
                        }
                    } else {
                        output[key] = source[key];
                    }
                });
            }
            
            return output;
        },

        /**
         * Get default configuration
         * @private
         */
        _getDefaultConfig() {
            return {
                requiredFields: ['name', 'price', 'category'],
                optionalFields: ['id', 'image', 'description', 'stock', 'sku'],
                rules: {
                    name: { minLength: 1, maxLength: 200, allowEmpty: false, trim: true },
                    price: { min: 0, max: Infinity, allowZero: false, allowNegative: false, isNumeric: true },
                    category: { minLength: 1, maxLength: 100, allowEmpty: false, trim: true },
                    stock: { min: 0, isNumeric: true, allowZero: true }
                },
                behavior: {
                    strictMode: false,
                    autoTrim: true,
                    autoConvert: true,
                    removeInvalid: true,
                    logErrors: true,
                    throwErrors: false
                }
            };
        },

        /**
         * Internal logging
         * @private
         */
        _log(...args) {
            if (this.config.behavior && this.config.behavior.logErrors) {
                console.log('[UniversalProductValidator]', ...args);
            }
        }
    };

    // ==========================================
    // EXPORT TO WINDOW
    // ==========================================

    window.UniversalProductValidator = UniversalProductValidator;
    window.UProductValidator = UniversalProductValidator; // Shorthand alias

    console.log(`✅ UniversalProductValidator v${UniversalProductValidator.version} loaded`);

})(window);