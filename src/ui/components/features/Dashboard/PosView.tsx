import React from 'react';

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
    <div className="pos-view">
      <section className="panel">
        <div className="panel-header">
          <h3>today's summary</h3>
          <p>keep an eye on the key point-of-sale metrics for the day</p>
        </div>
        <div className="stat-card-grid">
          <StatCard title="total bills" value="42" helper="processed since store open" />
          <StatCard title="gross sales" value="BDT 52,300" helper="across all counters" />
          <StatCard title="discounts" value="BDT 1,480" helper="applied on eligible orders" />
          <StatCard title="due payments" value="BDT 6,900" helper="pending customer payments" />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>quick actions</h3>
          <p>accelerate billing with the most used operations</p>
        </div>
        <ul className="pos-actions">
          <li>scan medicine barcode to add to the current bill</li>
          <li>apply membership discount before finalizing payment</li>
          <li>print duplicate receipt for the last completed order</li>
        </ul>
      </section>
    </div>
  );
};
