import React from 'react';
import Search from '../../../assets/search.svg'
import './PosView.css'

interface StatCardProps {
  title: string;
  value: string;
  helper: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, helper }) => (
  <div className="stat-card">
    <h4>{title}</h4>
    <span className="stat-card-value">{value}</span>
    <p className="stat-card-helper">{helper}</p>
  </div>
);

export const PosView: React.FC = () => {
  return (
    <main>
      <section className='pos-header'>
        <div className='select-batch-bar'>
          <h2>BTC</h2>
          <input type="search"
          placeholder='select batch  '
          />
          <h2>ADD</h2>
        </div>
        <div className='price-bar'>
          <h1>$</h1>
          <input type="number"
          />
          <h2>10%</h2>
        </div>
      </section>
      <section>
      <div className='input'>
        <div className='input-section'>
          <div className='product-search'>
            <div className='search-icon'><img src={Search} alt="" /></div>
            <input type="search"
            placeholder='Search product...'
            />
          </div>
          <div className='qty-number'>
            <h2>QTY*</h2>
            <input type="number" />
          </div>
          <button className='input-button'>Add</button>
        </div>
        <div className='pos-account-section'>
        <h1>
        1001.50
        </h1>
          <div className='input-account'>
            <input type="text"
             placeholder='Contact number for retarget-sale'
              />
            <div className='search-icon'><img src={Search} alt="" /></div>
          </div>
        </div>
      </div>
      <div className='product-description'>
        <div className="header-products-table-wrapper">
                <table className="header-products-table">
                  <thead>
                    <tr>
                      <th>Product Description</th>
                      <th>Company Name</th>
                      <th>MRP</th>
                      <th>In-Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                      <tr>

                        <td>
                          No product selected
                        </td>
                        <td>
                          No product selected
                        </td>
                        <td>
                          No product selected
                        </td>
                        <td>
                          No product selected
                        </td>
                      </tr>
                  </tbody>
                </table>
        </div>
       <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Product Description</th>
              <th>Rate</th>
              <th>QTY</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>No product selected</td>
              <td>No product selected</td>
              <td>
                <input type="number" placeholder="0" className="qty-input" />
              </td>
              <td>No product selected</td>
              <td>No product selected</td>
            </tr>
          </tbody>
        </table>
        </div>

      </div>
      </section>
      {/* bottom section  */}
      <section className='bottom-section'>
      <div className="order-section">
        <div className='user-section'>
          <div className='user-number-search'>
            <input type="search"
            placeholder='search user by phone number'
            />
            <div className='user-search-icon'>
              <img src={Search} alt="" />
              </div>
          </div>
        <div className='user-button'>
          <button className='user-exit-section'>
            <img src="src/assets/user-exit.svg" alt="" />
          <span>User Exit</span>
          </button>
          <button className='not-exit-section'>
            <img src="src/assets/not-exit.svg" alt="" />
            <span>Not Exit</span>
            </button>
        </div>
        </div>
      <div className="input-order">
        <div className='input-order-bill'>
          <div className="input-order-section">
                  <div className="product-order-search">
                    <input type="search" placeholder="Order Number ?" />
                    <div className="search-icon">
                      <img src={Search} alt="search" />
                    </div>
                  </div>
                  <button className="input-order-button">Return Confirm</button>
                </div>

                {/* === Bottom Info Bar === */}
                <div className="bottom-info">
                  <div className='return-checkbox'>
                    <input type="checkbox" />
                  <label className="return-label">Return</label>
                  </div>
                  <div className="phone">
                    <img src="src/assets/user-alt.svg" alt="" />
                    <p>01616815056</p>
                    </div>
                  <div className="delivery">
                    <img src="src/assets/vector.svg" alt="" />
                     <p>Home-Delivery</p>
                     </div>
                </div>
             </div>
                <div className="bill-section">
                    <span>1025</span>
                  </div>

           </div>

      {/* === Table Section === */}
      <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Product Description</th>
              <th>Company Name</th>
              <th>Rate</th>
              <th>QTY</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>No product selected</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        </div>
    </div>
    <div>
      <p className='border'></p>
      <div className='Order-price'>
      <div className='total'>
        <span>Total:</span>
        <span>Discount:</span>
        <span>Net:</span>
      </div>
      <h2 className='sold-out-btn'>
        SOLD OUT
      </h2>
    </div>
    </div>
      </section>
    </main>

  );
};
