import React, { useState } from 'react';

type AddStockForm = {
  productName: string;
  sku: string;
  quantity: string;
  costPrice: string;
  salePrice: string;
  expiryDate: string;
  notes: string;
};

const initialFormState: AddStockForm = {
  productName: '',
  sku: '',
  quantity: '',
  costPrice: '',
  salePrice: '',
  expiryDate: '',
  notes: '',
};

export const AddStockView: React.FC = () => {
  const [formState, setFormState] = useState<AddStockForm>(initialFormState);

  const handleChange = (field: keyof AddStockForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    alert('stock details captured locally. connect to your inventory api to persist.');
    setFormState(initialFormState);
  };

  const handleReset = () => {
    setFormState(initialFormState);
  };

  return (
    <div className="add-stock-view">
      <section className="panel">
        <div className="panel-header">
          <h3>add new stock</h3>
          <p>capture core product details before syncing with the inventory backend</p>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            product name
            <input
              type="text"
              placeholder="enter product name"
              value={formState.productName}
              onChange={handleChange('productName')}
              required
            />
          </label>

          <label>
            sku / batch no.
            <input
              type="text"
              placeholder="sku or batch"
              value={formState.sku}
              onChange={handleChange('sku')}
            />
          </label>

          <label>
            quantity
            <input
              type="number"
              min="0"
              placeholder="available units"
              value={formState.quantity}
              onChange={handleChange('quantity')}
              required
            />
          </label>

          <label>
            cost price
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="purchase price"
              value={formState.costPrice}
              onChange={handleChange('costPrice')}
            />
          </label>

          <label>
            sale price
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="default sale price"
              value={formState.salePrice}
              onChange={handleChange('salePrice')}
            />
          </label>

          <label>
            expiry date
            <input
              type="date"
              value={formState.expiryDate}
              onChange={handleChange('expiryDate')}
            />
          </label>

          <label>
            notes
            <textarea
              rows={3}
              placeholder="any handling or storage notes"
              value={formState.notes}
              onChange={handleChange('notes')}
            />
          </label>

          <div className="form-actions">
            <button type="button" className="form-reset" onClick={handleReset}>
              clear
            </button>
            <button type="submit" className="form-submit">
              save draft
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
