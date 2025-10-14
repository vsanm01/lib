/**
 * ========================================
 * UNIVERSAL CATEGORY MANAGER CDN
 * ========================================
 * Standalone library for managing product categories
 * Supports: Dynamic extraction, Filtering, Responsive display, Scrolling
 * 
 * @version 1.0.0
 * @author Your Name
 * @license MIT
 */

(function(window) {
    'use strict';

    // ==========================================
    // MAIN CATEGORY MANAGER CLASS
    // ==========================================
    const UniversalCategoryManager = {
        version: '1.0.0',
        
        // Internal state
        state: {
            allCategories: [],
            visibleCategories: [],
            hiddenCategories: [],
            currentCategory: 'all',
            isExpanded: false,
            products: []
        },
        
        // Configuration
        config: {
            // Display settings
            display: {
                showAllOption: true,           // Show "All" category
                allOptionLabel: 'All',         // Label for "All" option
                allOptionValue: 'all',         // Value for "All" option
                showMoreButton: true,          // Show "+X More" button
                showLessButton: true,          // Show "Show Less" button
                moreButtonFormat: '+{count} More',  // Format for more button
                lessButtonLabel: 'Show Less'   // Label for less button
            },
            
            // Responsive settings
            responsive: {
                mobile: {
                    breakpoint: 768,           // Mobile breakpoint (px)
                    maxVisible: 4              // Max categories on mobile (excluding "All")
                },
                tablet: {
                    breakpoint: 1024,          // Tablet breakpoint (px)
                    maxVisible: 5              // Max categories on tablet
                },
                desktop: {
                    maxVisible: 6              // Max categories on desktop
                }
            },
            
            // Scrolling settings
            scrolling: {
                enabled: true,                 // Enable horizontal scrolling
                scrollAmount: 200,             // Scroll amount in pixels
                showArrows: true,              // Show scroll arrows
                autoHide: true                 // Auto-hide arrows when not needed
            },
            
            // Sorting settings
            sorting: {
                enabled: true,                 // Enable category sorting
                method: 'alphabetical',        // 'alphabetical', 'count', 'custom', 'none'
                direction: 'asc',              // 'asc' or 'desc'
                customOrder: []                // Custom order array
            },
            
            // Field mapping
            fieldMapping: {
                categoryField: 'category',     // Product category field name
                caseInsensitive: true,         // Case-insensitive comparison
                trim: true                     // Trim whitespace
            },
            
            // Callbacks
            callbacks: {
                onCategoryChange: null,        // Called when category changes
                onCategoriesUpdate: null,      // Called when categories are updated
                onExpand: null,                // Called when expanded
                onCollapse: null               // Called when collapsed
            },
            
            // Behavior
            behavior: {
                rememberSelection: false,      // Remember last selected category
                storageKey: 'selectedCategory', // LocalStorage key
                enableLogging: false           // Enable console logging
            }
        },

        // ==========================================
        // INITIALIZATION
        // ==========================================

        /**
         * Initialize category manager with products
         * @param {array} products - Array of product objects
         * @param {object} options - Configuration options
         * @returns {object} Categories data
         */
        init(products, options = {}) {
            try {
                // Merge options with config
                this.configure(options);
                
                // Store products
                this.state.products = products || [];
                
                // Extract categories
                this.extractCategories();
                
                // Apply sorting
                if (this.config.sorting.enabled) {
                    this.sortCategories();
                }
                
                // Determine visible/hidden categories
                this.updateVisibility();
                
                // Restore previous selection if enabled
                if (this.config.behavior.rememberSelection) {
                    this.restoreSelection();
                }
                
                this._log('Initialized with', this.state.allCategories.length, 'categories');
                
                // Call callback
                if (this.config.callbacks.onCategoriesUpdate) {
                    this.config.callbacks.onCategoriesUpdate(this.state.allCategories);
                }
                
                return this.getCategoriesData();
                
            } catch (error) {
                console.error('[CategoryManager] Initialization error:', error);
                return null;
            }
        },

        // ==========================================
        // CATEGORY EXTRACTION
        // ==========================================

        /**
         * Extract unique categories from products
         * @returns {array} Array of unique categories
         */
        extractCategories() {
            const categoryField = this.config.fieldMapping.categoryField;
            const caseInsensitive = this.config.fieldMapping.caseInsensitive;
            const trim = this.config.fieldMapping.trim;
            
            const categoriesMap = new Map();
            
            this.state.products.forEach(product => {
                let category = product[categoryField];
                
                if (!category) return;
                
                // Trim if enabled
                if (trim && typeof category === 'string') {
                    category = category.trim();
                }
                
                // Skip empty categories
                if (category === '') return;
                
                // Handle case insensitive
                const key = caseInsensitive && typeof category === 'string' 
                    ? category.toLowerCase() 
                    : category;
                
                // Store with count
                if (categoriesMap.has(key)) {
                    categoriesMap.get(key).count++;
                } else {
                    categoriesMap.set(key, {
                        name: category,
                        key: key,
                        count: 1
                    });
                }
            });
            
            // Convert to array
            this.state.allCategories = Array.from(categoriesMap.values())
                .map(cat => cat.name);
            
            this._log('Extracted', this.state.allCategories.length, 'unique categories');
            
            return this.state.allCategories;
        },

        /**
         * Get categories with product counts
         * @returns {array} Array of {name, count} objects
         */
        getCategoriesWithCount() {
            const categoryField = this.config.fieldMapping.categoryField;
            const counts = {};
            
            this.state.products.forEach(product => {
                const category = product[categoryField];
                if (category) {
                    counts[category] = (counts[category] || 0) + 1;
                }
            });
            
            return this.state.allCategories.map(category => ({
                name: category,
                count: counts[category] || 0
            }));
        },

        // ==========================================
        // CATEGORY SORTING
        // ==========================================

        /**
         * Sort categories based on configuration
         */
        sortCategories() {
            const method = this.config.sorting.method;
            const direction = this.config.sorting.direction;
            
            switch (method) {
                case 'alphabetical':
                    this.state.allCategories.sort((a, b) => {
                        return direction === 'asc' 
                            ? a.localeCompare(b)
                            : b.localeCompare(a);
                    });
                    break;
                    
                case 'count':
                    const counts = this.getCategoriesWithCount();
                    counts.sort((a, b) => {
                        return direction === 'asc'
                            ? a.count - b.count
                            : b.count - a.count;
                    });
                    this.state.allCategories = counts.map(c => c.name);
                    break;
                    
                case 'custom':
                    if (Array.isArray(this.config.sorting.customOrder)) {
                        this.state.allCategories.sort((a, b) => {
                            const indexA = this.config.sorting.customOrder.indexOf(a);
                            const indexB = this.config.sorting.customOrder.indexOf(b);
                            
                            if (indexA === -1 && indexB === -1) return 0;
                            if (indexA === -1) return 1;
                            if (indexB === -1) return -1;
                            
                            return indexA - indexB;
                        });
                    }
                    break;
                    
                case 'none':
                default:
                    // No sorting
                    break;
            }
            
            this._log('Categories sorted by', method);
        },

        /**
         * Custom sort with comparator function
         * @param {function} compareFn - Comparison function
         */
        sortWith(compareFn) {
            if (typeof compareFn === 'function') {
                this.state.allCategories.sort(compareFn);
                this.updateVisibility();
                this._log('Categories sorted with custom function');
            }
        },

        // ==========================================
        // VISIBILITY MANAGEMENT
        // ==========================================

        /**
         * Update visible/hidden categories based on screen size
         */
        updateVisibility() {
            const maxVisible = this.getMaxVisibleCategories();
            
            this.state.visibleCategories = this.state.allCategories.slice(0, maxVisible);
            this.state.hiddenCategories = this.state.allCategories.slice(maxVisible);
            
            this._log('Visible:', this.state.visibleCategories.length, 
                      'Hidden:', this.state.hiddenCategories.length);
        },

        /**
         * Get maximum visible categories based on screen size
         * @returns {number} Max visible count
         */
        getMaxVisibleCategories() {
            const width = window.innerWidth;
            const responsive = this.config.responsive;
            
            if (width <= responsive.mobile.breakpoint) {
                return responsive.mobile.maxVisible;
            } else if (width <= responsive.tablet.breakpoint) {
                return responsive.tablet.maxVisible;
            } else {
                return responsive.desktop.maxVisible;
            }
        },

        /**
         * Expand to show all categories
         */
        expand() {
            this.state.isExpanded = true;
            this.state.visibleCategories = [...this.state.allCategories];
            this.state.hiddenCategories = [];
            
            this._log('Categories expanded');
            
            if (this.config.callbacks.onExpand) {
                this.config.callbacks.onExpand();
            }
        },

        /**
         * Collapse to show limited categories
         */
        collapse() {
            this.state.isExpanded = false;
            this.updateVisibility();
            
            this._log('Categories collapsed');
            
            if (this.config.callbacks.onCollapse) {
                this.config.callbacks.onCollapse();
            }
        },

        /**
         * Toggle expand/collapse
         */
        toggle() {
            if (this.state.isExpanded) {
                this.collapse();
            } else {
                this.expand();
            }
        },

        // ==========================================
        // CATEGORY SELECTION & FILTERING
        // ==========================================

        /**
         * Set current category
         * @param {string} category - Category name or 'all'
         * @returns {array} Filtered products
         */
        setCategory(category) {
            this.state.currentCategory = category;
            
            this._log('Category changed to:', category);
            
            // Save to storage if enabled
            if (this.config.behavior.rememberSelection) {
                this.saveSelection(category);
            }
            
            // Call callback
            if (this.config.callbacks.onCategoryChange) {
                this.config.callbacks.onCategoryChange(category);
            }
            
            return this.filterProducts(category);
        },

        /**
         * Get current category
         * @returns {string} Current category
         */
        getCurrentCategory() {
            return this.state.currentCategory;
        },

        /**
         * Filter products by category
         * @param {string} category - Category name or 'all'
         * @returns {array} Filtered products
         */
        filterProducts(category = null) {
            const cat = category || this.state.currentCategory;
            const allValue = this.config.display.allOptionValue;
            const categoryField = this.config.fieldMapping.categoryField;
            
            if (cat === allValue) {
                return [...this.state.products];
            }
            
            return this.state.products.filter(product => {
                const productCategory = product[categoryField];
                
                if (this.config.fieldMapping.caseInsensitive) {
                    return productCategory && 
                           productCategory.toLowerCase() === cat.toLowerCase();
                }
                
                return productCategory === cat;
            });
        },

        /**
         * Get products count for category
         * @param {string} category - Category name
         * @returns {number} Product count
         */
        getCategoryCount(category) {
            return this.filterProducts(category).length;
        },

        // ==========================================
        // SELECTION PERSISTENCE
        // ==========================================

        /**
         * Save category selection to storage
         * @param {string} category - Category to save
         */
        saveSelection(category) {
            try {
                const key = this.config.behavior.storageKey;
                localStorage.setItem(key, category);
            } catch (error) {
                // LocalStorage might be disabled
                this._log('Could not save selection:', error.message);
            }
        },

        /**
         * Restore category selection from storage
         */
        restoreSelection() {
            try {
                const key = this.config.behavior.storageKey;
                const saved = localStorage.getItem(key);
                
                if (saved) {
                    // Verify category exists
                    const allValue = this.config.display.allOptionValue;
                    if (saved === allValue || this.state.allCategories.includes(saved)) {
                        this.state.currentCategory = saved;
                        this._log('Restored selection:', saved);
                    }
                }
            } catch (error) {
                this._log('Could not restore selection:', error.message);
            }
        },

        /**
         * Clear saved selection
         */
        clearSelection() {
            try {
                const key = this.config.behavior.storageKey;
                localStorage.removeItem(key);
                this.state.currentCategory = this.config.display.allOptionValue;
            } catch (error) {
                this._log('Could not clear selection:', error.message);
            }
        },

        // ==========================================
        // DATA GETTERS
        // ==========================================

        /**
         * Get complete categories data
         * @returns {object} Categories data
         */
        getCategoriesData() {
            return {
                all: this.state.allCategories,
                visible: this.state.visibleCategories,
                hidden: this.state.hiddenCategories,
                current: this.state.currentCategory,
                isExpanded: this.state.isExpanded,
                hasMore: this.state.hiddenCategories.length > 0,
                counts: this.getCategoriesWithCount()
            };
        },

        /**
         * Get all categories
         * @returns {array} All categories
         */
        getAllCategories() {
            return [...this.state.allCategories];
        },

        /**
         * Get visible categories
         * @returns {array} Visible categories
         */
        getVisibleCategories() {
            return [...this.state.visibleCategories];
        },

        /**
         * Get hidden categories
         * @returns {array} Hidden categories
         */
        getHiddenCategories() {
            return [...this.state.hiddenCategories];
        },

        /**
         * Check if category exists
         * @param {string} category - Category name
         * @returns {boolean}
         */
        hasCategory(category) {
            return this.state.allCategories.includes(category);
        },

        // ==========================================
        // HTML GENERATION
        // ==========================================

        /**
         * Generate HTML for category navigation
         * @param {object} options - Generation options
         * @returns {string} HTML string
         */
        generateHTML(options = {}) {
            const opts = {
                containerClass: 'categories-container',
                itemClass: 'category-item',
                activeClass: 'active',
                moreButtonClass: 'more-btn',
                lessButtonClass: 'less-btn',
                includeWrapper: true,
                ...options
            };
            
            let html = '';
            
            if (opts.includeWrapper) {
                html += `<div class="${opts.containerClass}">`;
            }
            
            // Add "All" option
            if (this.config.display.showAllOption) {
                const isActive = this.state.currentCategory === this.config.display.allOptionValue;
                html += this._generateCategoryItem(
                    this.config.display.allOptionLabel,
                    this.config.display.allOptionValue,
                    isActive,
                    opts
                );
            }
            
            // Add visible categories
            const categoriesToShow = this.state.isExpanded 
                ? this.state.allCategories 
                : this.state.visibleCategories;
            
            categoriesToShow.forEach(category => {
                const isActive = this.state.currentCategory === category;
                html += this._generateCategoryItem(category, category, isActive, opts);
            });
            
            // Add More/Less button
            if (this.config.display.showMoreButton && !this.state.isExpanded && this.state.hiddenCategories.length > 0) {
                const label = this.config.display.moreButtonFormat.replace(
                    '{count}',
                    this.state.hiddenCategories.length
                );
                html += `<button class="${opts.itemClass} ${opts.moreButtonClass}" data-action="expand">${label}</button>`;
            }
            
            if (this.config.display.showLessButton && this.state.isExpanded) {
                html += `<button class="${opts.itemClass} ${opts.lessButtonClass}" data-action="collapse">${this.config.display.lessButtonLabel}</button>`;
            }
            
            if (opts.includeWrapper) {
                html += '</div>';
            }
            
            return html;
        },

        /**
         * Generate single category item HTML
         * @private
         */
        _generateCategoryItem(label, value, isActive, opts) {
            const activeClass = isActive ? ` ${opts.activeClass}` : '';
            const count = this.getCategoryCount(value);
            const showCount = opts.showCount ? ` <span class="count">(${count})</span>` : '';
            
            return `<a href="#" class="${opts.itemClass}${activeClass}" data-category="${value}">${label}${showCount}</a>`;
        },

        /**
         * Generate category badges HTML
         * @returns {string} HTML string
         */
        generateBadges(options = {}) {
            const opts = {
                badgeClass: 'category-badge',
                showCount: true,
                ...options
            };
            
            return this.state.allCategories.map(category => {
                const count = this.getCategoryCount(category);
                const countHtml = opts.showCount ? ` <span class="badge-count">${count}</span>` : '';
                return `<span class="${opts.badgeClass}" data-category="${category}">${category}${countHtml}</span>`;
            }).join('');
        },

        // ==========================================
        // SCROLLING UTILITIES
        // ==========================================

        /**
         * Check if scrolling is needed
         * @param {HTMLElement} container - Container element
         * @returns {boolean}
         */
        needsScrolling(container) {
            if (!container) return false;
            return container.scrollWidth > container.clientWidth;
        },

        /**
         * Scroll container
         * @param {HTMLElement} container - Container to scroll
         * @param {string} direction - 'left' or 'right'
         */
        scroll(container, direction) {
            if (!container) return;
            
            const amount = direction === 'left' 
                ? -this.config.scrolling.scrollAmount 
                : this.config.scrolling.scrollAmount;
            
            container.scrollBy({ left: amount, behavior: 'smooth' });
        },

        /**
         * Check scroll position
         * @param {HTMLElement} container - Container element
         * @returns {object} {atStart: boolean, atEnd: boolean}
         */
        getScrollPosition(container) {
            if (!container) return { atStart: true, atEnd: true };
            
            return {
                atStart: container.scrollLeft <= 0,
                atEnd: container.scrollLeft >= (container.scrollWidth - container.clientWidth)
            };
        },

        // ==========================================
        // SEARCH & FILTER
        // ==========================================

        /**
         * Search categories by query
         * @param {string} query - Search query
         * @returns {array} Matching categories
         */
        search(query) {
            if (!query || query.trim() === '') {
                return this.state.allCategories;
            }
            
            const lowerQuery = query.toLowerCase();
            
            return this.state.allCategories.filter(category => {
                return category.toLowerCase().includes(lowerQuery);
            });
        },

        /**
         * Filter categories by minimum product count
         * @param {number} minCount - Minimum product count
         * @returns {array} Filtered categories
         */
        filterByCount(minCount) {
            const counts = this.getCategoriesWithCount();
            return counts
                .filter(c => c.count >= minCount)
                .map(c => c.name);
        },

        // ==========================================
        // CONFIGURATION
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
            this._log('Configuration reset');
        },

        // ==========================================
        // UTILITY METHODS
        // ==========================================

        /**
         * Refresh categories from products
         */
        refresh() {
            this.extractCategories();
            if (this.config.sorting.enabled) {
                this.sortCategories();
            }
            this.updateVisibility();
            
            this._log('Categories refreshed');
            
            if (this.config.callbacks.onCategoriesUpdate) {
                this.config.callbacks.onCategoriesUpdate(this.state.allCategories);
            }
        },

        /**
         * Update products and refresh
         * @param {array} products - New products array
         */
        updateProducts(products) {
            this.state.products = products || [];
            this.refresh();
        },

        /**
         * Clear all data
         */
        clear() {
            this.state = {
                allCategories: [],
                visibleCategories: [],
                hiddenCategories: [],
                currentCategory: this.config.display.allOptionValue,
                isExpanded: false,
                products: []
            };
            this._log('Data cleared');
        },

        // ==========================================
        // PRIVATE HELPER METHODS
        // ==========================================

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
         * Check if value is object
         * @private
         */
        _isObject(value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value);
        },

        /**
         * Get default configuration
         * @private
         */
        _getDefaultConfig() {
            return {
                display: {
                    showAllOption: true,
                    allOptionLabel: 'All',
                    allOptionValue: 'all',
                    showMoreButton: true,
                    showLessButton: true,
                    moreButtonFormat: '+{count} More',
                    lessButtonLabel: 'Show Less'
                },
                responsive: {
                    mobile: { breakpoint: 768, maxVisible: 4 },
                    tablet: { breakpoint: 1024, maxVisible: 5 },
                    desktop: { maxVisible: 6 }
                },
                scrolling: {
                    enabled: true,
                    scrollAmount: 200,
                    showArrows: true,
                    autoHide: true
                },
                sorting: {
                    enabled: true,
                    method: 'alphabetical',
                    direction: 'asc',
                    customOrder: []
                },
                fieldMapping: {
                    categoryField: 'category',
                    caseInsensitive: true,
                    trim: true
                },
                callbacks: {
                    onCategoryChange: null,
                    onCategoriesUpdate: null,
                    onExpand: null,
                    onCollapse: null
                },
                behavior: {
                    rememberSelection: false,
                    storageKey: 'selectedCategory',
                    enableLogging: false
                }
            };
        },

        /**
         * Internal logging
         * @private
         */
        _log(...args) {
            if (this.config.behavior.enableLogging) {
                console.log('[UniversalCategoryManager]', ...args);
            }
        }
    };

    // ==========================================
    // EXPORT TO WINDOW
    // ==========================================

    window.UniversalCategoryManager = UniversalCategoryManager;
    window.UCategoryManager = UniversalCategoryManager; // Shorthand alias

    console.log(`✅ UniversalCategoryManager v${UniversalCategoryManager.version} loaded`);

})(window);