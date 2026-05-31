// Availability Management Components
// NOTA: Após a migração para o modelo "concorrente do Airbnb → vitrine que
// despacha pro Airbnb" (jan/2026), o sistema NÃO gere mais disponibilidade
// internamente. Os componentes abaixo só fazem sentido para visit/key_pickup/
// support — não para reservas de imóvel. CalendarExportMenu e
// PropertyICalManagement foram removidos.
export { default as AvailabilityRulesManager } from './AvailabilityRulesManager/AvailabilityRulesManager';
export { default as AvailabilityInsights } from './AvailabilityInsights/AvailabilityInsights';
export { PropertyAvailability } from './PropertyEdit/Availability';
export { default as SimpleAvailabilityPicker } from './SimpleAvailabilityPicker/SimpleAvailabilityPicker';
