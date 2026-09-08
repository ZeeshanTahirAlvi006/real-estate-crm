import { KpiCard, type KpiCardProps } from './KpiCard'

export type StatCardProps = KpiCardProps

/**
 * StatCard — Alias of KpiCard for backward compatibility.
 * Use KpiCard for all new KPI and metric cards.
 */
export const StatCard = KpiCard
export default StatCard
