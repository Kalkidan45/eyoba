import React, { useState } from 'react';
import { Category, ClothingItem } from '../types';
import { formatCurrency } from '../utils/storage';

interface CategoryModuleProps {
  categories: Category[];
  products: ClothingItem[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const CategoryModule: React.FC<CategoryModuleProps> = ({
  categories,
  products,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    colorBadge: 'indigo',
  });

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      colorBadge: 'indigo',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      description: cat.description,
      colorBadge: cat.colorBadge,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Please fill in category name and 3-letter code.');
      return;
    }

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        colorBadge: formData.colorBadge,
      });
    } else {
      onAddCategory({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        colorBadge: formData.colorBadge,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-900">Apparel Categories</h3>
          <p className="text-xs text-slate-500">
            Structure your clothing lines into departments, styles, and barcode SKU prefix families
          </p>
        </div>
        <button
          id="btn-add-category"
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          + Add Category
        </button>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const catProducts = products.filter((p) => p.categoryId === cat.id);
          const totalUnits = catProducts.reduce((sum, p) => sum + p.stockQuantity, 0);
          const totalCostVal = catProducts.reduce((sum, p) => sum + p.stockQuantity * p.purchasePrice, 0);
          const totalRetailVal = catProducts.reduce((sum, p) => sum + p.stockQuantity * p.retailPrice, 0);

          return (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-xs text-slate-800">
                    Prefix: {cat.code}
                  </span>
                  <div className="flex items-center space-x-2 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="text-slate-500 hover:text-slate-800 transition-colors"
                      title="Edit Category"
                    >
                      Edit
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (catProducts.length > 0) {
                          alert(`Cannot delete category "${cat.name}" because it contains ${catProducts.length} items. Reassign or delete those items first.`);
                          return;
                        }
                        if (window.confirm(`Delete category "${cat.name}"?`)) {
                          onDeleteCategory(cat.id);
                        }
                      }}
                      className="text-rose-500 hover:text-rose-700 transition-colors"
                      title="Delete Category"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-base text-slate-900 mb-1">{cat.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{cat.description || 'No description provided.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Variants</span>
                  <span className="font-bold text-slate-900">{catProducts.length}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">In Stock</span>
                  <span className="font-bold text-indigo-700">{totalUnits}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Cost Asset</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalCostVal)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="pt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T-Shirts & Tops"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SKU Prefix Code (2-4 letters) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="e.g. TSH, JKT, TRS"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cotton crews, heavyweights, v-necks, graphic tees"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
