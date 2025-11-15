/**
 * StatCard Component
 * Displays statistics card
 */

import React from 'react'
import { StatCardProps } from '../types'

export const StatCard: React.FC<StatCardProps> = ({ title, value, helper }) => (
  <div className="stat-card">
    <h4>{title}</h4>
    <span className="stat-card-value">{value}</span>
    <p className="stat-card-helper">{helper}</p>
  </div>
)
