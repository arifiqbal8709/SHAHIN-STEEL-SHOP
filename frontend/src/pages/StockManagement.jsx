import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Search, AlertTriangle, ArrowUpDown, History,
  CheckCircle2, X, Filter, RefreshCw, ShieldCheck, Trash2, Edit3, Save
} from 'lucide-react';
import { stockAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StockManagement = () => {
  const { user, isOwner } = useAuth();
  // Staff cannot edit or adjust stock: only Owner/Admin has permission!
  const canModifyStock = isOwner();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' or 'history'
  const [movements, setMovements] = useState([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState('MANUAL_CORRECTION');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Edit Product Form State
  const [editProductData, setEditProductData] = useState({
    id: null,
    product_name: '',
    product_code: '',
    category: 'Steel Items',
    purchase_price: '',
    selling_price: '',
    available_quantity: '',
    minimum_stock: 5,
    unit: 'PCS',
    description: ''
  });

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    product_code: '',
    category: 'Steel Items',
    purchase_price: '',
    selling_price: '',
    available_quantity: '',
    minimum_stock: 5,
    unit: 'PCS',
    description: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await stockAPI.getAll();
      if (res && res.data) {
        setProducts(res.data);
      }
      const movRes = await stockAPI.getMovements();
      if (movRes && movRes.data) {
        setMovements(movRes.data);
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('shahin-cloud-sync', loadData);
    return () => window.removeEventListener('shahin-cloud-sync', loadData);
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.product_name || !newProduct.product_name.trim()) {
      alert('Product name is required.');
      return;
    }
    try {
      const res = await stockAPI.create({
        ...newProduct,
        product_name: newProduct.product_name.trim(),
        product_code: (newProduct.product_code || '').trim(),
        category: newProduct.category || 'Steel Items',
        purchase_price: Number(newProduct.purchase_price || 0),
        selling_price: Number(newProduct.selling_price || 0),
        available_quantity: Number(newProduct.available_quantity || 0),
        minimum_stock: Number(newProduct.minimum_stock || 5),
        unit: newProduct.unit || 'PCS',
        description: (newProduct.description || '').trim()
      });
      if (res && res.success) {
        setIsAddModalOpen(false);
        const item = res.data;
        if (item) {
          setProducts(prev => {
            const exists = prev.some(p => p.id === item.id || (item.product_code && p.product_code === item.product_code));
            return exists ? prev : [item, ...prev];
          });
        }
        setNewProduct({
          product_name: '',
          product_code: '',
          category: 'Steel Items',
          purchase_price: '',
          selling_price: '',
          available_quantity: '',
          minimum_stock: 5,
          unit: 'PCS',
          description: ''
        });
        await loadData();
      } else {
        alert(res?.message || 'Failed to add product');
      }
    } catch (err) {
      alert('Error creating product: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await stockAPI.adjust(selectedProduct.id, {
        quantity_changed: adjustQty,
        movement_type: adjustType,
        notes: adjustNotes
      });
      if (res && res.success) {
        setIsAdjustModalOpen(false);
        setSelectedProduct(null);
        setAdjustQty(0);
        setAdjustNotes('');
        loadData();
      } else {
        alert(res.message || 'Stock adjustment failed');
      }
    } catch (err) {
      alert('Adjustment error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenEditModal = (p) => {
    setEditProductData({
      id: p.id,
      product_name: p.product_name || '',
      product_code: p.product_code || '',
      category: p.category_name || p.category || 'Steel Items',
      purchase_price: p.purchase_price !== undefined ? p.purchase_price : '',
      selling_price: p.selling_price !== undefined ? p.selling_price : '',
      available_quantity: p.available_quantity !== undefined ? p.available_quantity : '',
      minimum_stock: p.minimum_stock !== undefined ? p.minimum_stock : 5,
      unit: p.unit || 'PCS',
      description: p.description || ''
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    if (!editProductData.product_name || !editProductData.product_name.trim()) {
      alert('Product name is required.');
      return;
    }
    try {
      const res = await stockAPI.update(editProductData.id, {
        product_name: editProductData.product_name.trim(),
        product_code: (editProductData.product_code || '').trim(),
        category: editProductData.category || 'Steel Items',
        purchase_price: Number(editProductData.purchase_price || 0),
        selling_price: Number(editProductData.selling_price || 0),
        available_quantity: Number(editProductData.available_quantity || 0),
        minimum_stock: Number(editProductData.minimum_stock || 5),
        unit: editProductData.unit || 'PCS',
        description: (editProductData.description || '').trim()
      });
      if (res && res.success) {
        setIsEditModalOpen(false);
        const updated = res.data;
        if (updated) {
          setProducts(prev => prev.map(p => (p.id === editProductData.id ? { ...p, ...updated } : p)));
        }
        await loadData();
      } else {
        alert(res?.message || 'Failed to update product');
      }
    } catch (err) {
      alert('Error updating product: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.product_name}" (${product.product_code})?`)) return;
    try {
      const res = await stockAPI.delete(product.id);
      if (res && res.success) {
        loadData();
      } else {
        alert(res?.message || 'Failed to delete product');
      }
    } catch (err) {
      alert('Error deleting product: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearAllStock = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL inventory stock items? All products will be permanently removed so you can enter fresh data!')) return;
    try {
      const res = await stockAPI.deleteAll();
      if (res && res.success) {
        alert('All inventory products have been cleared successfully!');
        loadData();
      } else {
        alert(res?.message || 'Failed to clear stock');
      }
    } catch (err) {
      alert('Error clearing inventory: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredProducts = products.filter(p => {
    const cat = (p.category_name || p.category || '').toLowerCase();
    const matchesCat = categoryFilter === 'ALL' || cat.includes(categoryFilter.toLowerCase());
    const matchesSearch = !search.trim() ||
      (p.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.product_code || '').toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5E2DE] shadow-subtle">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#C49A6C]">Module 3</span>
          <h1 className="font-serif text-2xl font-extrabold text-[#211F1C] m-0">Inventory &amp; Stock Management</h1>
          <p className="text-xs text-[#71717A] mt-1">
            Opening/Closing Stock, Inward, Outward, Adjustments for Plastic, Wooden &amp; Steel lines.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isOwner() && products.length > 0 && (
            <button
              onClick={handleClearAllStock}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-subtle"
              title="Permanently remove all products"
            >
              <Trash2 size={15} /> Clear All Stock
            </button>
          )}
          {canModifyStock ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#211F1C] text-white hover:bg-[#C49A6C] hover:text-[#211F1C] text-xs font-bold transition-all shadow-subtle"
            >
              <Plus size={16} /> Add Product
            </button>
          ) : (
            <span className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-amber-700" /> Stock Catalog (Read-Only Staff Mode)
            </span>
          )}
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E5E2DE] shadow-subtle">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F7F5F0] p-1 rounded-xl border border-[#E5E2DE]">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'catalog' ? 'bg-[#211F1C] text-white' : 'text-[#71717A]'
              }`}
            >
              Current Stock Catalog
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history' ? 'bg-[#211F1C] text-white' : 'text-[#71717A]'
              }`}
            >
              <History size={14} /> Stock Movements Audit
            </button>
          </div>
        </div>

        {activeTab === 'catalog' && (
          <div className="flex items-center gap-3">
            {/* Category Filter Pills (Plastic, Wooden, Steel) */}
            <div className="flex items-center gap-1 bg-[#F7F5F0] p-1 rounded-lg border border-[#E5E2DE] overflow-x-auto">
              {['ALL', 'Steel', 'Wooden', 'Plastic'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    categoryFilter === cat
                      ? 'bg-[#C49A6C] text-[#211F1C]'
                      : 'text-[#71717A] hover:text-[#211F1C]'
                  }`}
                >
                  {cat === 'ALL' ? 'All Items' : `${cat} Items`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39E98]" />
              <input
                type="text"
                placeholder="Search item code/name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:outline-none focus:border-[#C49A6C]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === 'catalog' ? (
        <div className="bg-white rounded-2xl border border-[#E5E2DE] overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="table-luxury">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Purchase Cost</th>
                  <th>Selling Price</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-xs text-[#71717A]">
                      Loading inventory records from MySQL cloud database...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-xs text-[#71717A]">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isLow = p.available_quantity <= p.minimum_stock;
                    return (
                      <tr key={p.id}>
                        <td className="font-mono text-xs font-bold text-[#C49A6C]">{p.product_code}</td>
                        <td>
                          <p className="font-bold text-xs text-[#211F1C]">{p.product_name}</p>
                          <p className="text-[10px] text-[#A39E98] truncate max-w-xs">{p.description}</p>
                        </td>
                        <td>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#EEE6DB] text-[#211F1C]">
                            {p.category_name}
                          </span>
                        </td>
                        <td className="text-xs font-medium text-[#71717A]">{fmt(p.purchase_price)}</td>
                        <td className="text-xs font-bold text-[#211F1C]">{fmt(p.selling_price)}</td>
                        <td>
                          <span className="font-serif text-base font-extrabold text-[#211F1C]">
                            {p.available_quantity} {p.unit || 'PCS'}
                          </span>
                        </td>
                        <td>
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700">
                              <AlertTriangle size={11} /> Low Stock (Min: {p.minimum_stock})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={11} /> In Stock
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          {canModifyStock ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1"
                                title="Edit product details"
                              >
                                <Edit3 size={13} /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setIsAdjustModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#EEE6DB] hover:bg-[#C49A6C] hover:text-[#211F1C] text-[#211F1C] text-xs font-bold transition-all"
                              >
                                Adjust
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all"
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-[#71717A]">
                              Available for Sale
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Stock Movement History Table */
        <div className="bg-white rounded-2xl border border-[#E5E2DE] overflow-hidden shadow-subtle">
          <div className="p-4 border-b border-[#E5E2DE]">
            <h4 className="font-serif font-bold text-sm text-[#211F1C]">Stock Movement Audit Trail</h4>
            <p className="text-xs text-[#71717A]">Complete log of openings, sales deductions, purchases, returns &amp; adjustments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table-luxury">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Movement Type</th>
                  <th>Qty Changed</th>
                  <th>Prev Qty</th>
                  <th>New Qty</th>
                  <th>Ref #</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-xs text-[#71717A]">
                      No historical movement logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m, idx) => (
                    <tr key={idx}>
                      <td className="text-xs text-[#71717A]">
                        {new Date(m.movement_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="font-bold text-xs">{m.product_name}</td>
                      <td>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-[#F7F5F0] rounded border border-[#E5E2DE]">
                          {m.movement_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`font-bold text-xs ${m.quantity_changed > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantity_changed > 0 ? `+${m.quantity_changed}` : m.quantity_changed}
                      </td>
                      <td className="text-xs text-[#71717A]">{m.previous_quantity}</td>
                      <td className="text-xs font-bold">{m.new_quantity}</td>
                      <td className="font-mono text-xs text-[#A39E98]">{m.reference_id || '—'}</td>
                      <td className="text-xs text-[#71717A]">{m.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Modal 1: Add New Product ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DE] mb-4">
              <h3 className="font-serif font-bold text-base text-[#211F1C]">Add Showroom Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-[#71717A] hover:bg-[#F7F5F0]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Steel Almirah 3-Door with Mirror"
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Category *</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  >
                    <option value="Steel Items">Steel Items</option>
                    <option value="Wooden Items">Wooden Items</option>
                    <option value="Plastic Items">Plastic Items</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Product Code / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. STL-ALM-101"
                    value={newProduct.product_code}
                    onChange={(e) => setNewProduct({ ...newProduct, product_code: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Factory purchase cost"
                    value={newProduct.purchase_price}
                    onChange={(e) => setNewProduct({ ...newProduct, purchase_price: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Showroom retail rate"
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_price: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Initial Opening Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Quantity in units"
                    value={newProduct.available_quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, available_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Minimum Stock Alert</label>
                  <input
                    type="number"
                    value={newProduct.minimum_stock}
                    onChange={(e) => setNewProduct({ ...newProduct, minimum_stock: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Description / Spec</label>
                <textarea
                  rows="2"
                  placeholder="Material specs, lock type, dimensions, finish..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#211F1C] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C49A6C] hover:bg-[#dfb76c] text-[#211F1C] rounded-xl text-xs font-extrabold shadow-subtle"
                >
                  Save Product to Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Stock Adjustment ─── */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DE] mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#211F1C]">Adjust Inventory</h3>
                <p className="text-xs text-[#71717A]">{selectedProduct.product_name}</p>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="p-1 rounded-lg text-[#71717A] hover:bg-[#F7F5F0]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="p-3 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] flex justify-between text-xs">
                <span>Current Quantity:</span>
                <strong className="font-serif text-sm">{selectedProduct.available_quantity} Units</strong>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Adjustment Reason</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold"
                >
                  <option value="MANUAL_CORRECTION">Manual Inventory Correction</option>
                  <option value="INWARD_PURCHASE">Godown Inward Arrival</option>
                  <option value="DAMAGE_ADJUSTMENT">Showroom Damage / Loss</option>
                  <option value="SALES_RETURN">Customer Product Return</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">
                  Quantity to Add or Deduct *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Use +5 to add, -2 to deduct"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-sm font-bold text-center"
                />
                <span className="text-[10px] text-[#A39E98] mt-1 block">
                  New resulting stock: <strong>{selectedProduct.available_quantity + Number(adjustQty || 0)} units</strong>
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Adjustment Audit Notes</label>
                <input
                  type="text"
                  placeholder="Reason for stock correction"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#211F1C] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#211F1C] hover:bg-[#C49A6C] hover:text-[#211F1C] text-white rounded-xl text-xs font-extrabold shadow-subtle transition-all"
                >
                  Save Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 3: Edit Product ─── */}
      {isEditModalOpen && editProductData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 border border-[#E5E2DE] my-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DE] mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C49A6C]">Modify Catalog Item</span>
                <h3 className="font-serif font-bold text-lg text-[#211F1C]">Edit Product Details</h3>
              </div>
              <button onClick={handleCloseEditModal} className="p-1.5 rounded-xl text-[#71717A] hover:bg-[#F7F5F0]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editProductData.product_name}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, product_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-semibold focus:border-[#C49A6C] outline-none"
                    placeholder="e.g. Steel Almirah Deluxe 3-Door"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Product Code / SKU</label>
                  <input
                    type="text"
                    value={editProductData.product_code}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, product_code: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-mono font-bold focus:border-[#C49A6C] outline-none"
                    placeholder="e.g. PROD-STE-001"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Category *</label>
                  <select
                    value={editProductData.category}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  >
                    <option value="Steel Items">Steel Items</option>
                    <option value="Wooden Items">Wooden Items</option>
                    <option value="Plastic Items">Plastic Items</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Purchase Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editProductData.purchase_price}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, purchase_price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editProductData.selling_price}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, selling_price: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold text-emerald-700 focus:border-[#C49A6C] outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Available Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editProductData.available_quantity}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, available_quantity: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Min Stock Alert *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editProductData.minimum_stock}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, minimum_stock: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Unit of Measure</label>
                  <select
                    value={editProductData.unit}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs font-bold focus:border-[#C49A6C] outline-none"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[#71717A] uppercase mb-1">Description / Notes</label>
                  <textarea
                    rows="2"
                    value={editProductData.description}
                    onChange={(e) => setEditProductData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-[#E5E2DE] text-xs focus:border-[#C49A6C] outline-none resize-none"
                    placeholder="Item dimensions, material grade, or warranty details..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E2DE]">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#211F1C] rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C49A6C] hover:bg-[#dfb76c] text-[#211F1C] font-extrabold rounded-xl text-xs shadow-gold-glow flex items-center gap-1.5 transition-all"
                >
                  <Save size={14} /> Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;

