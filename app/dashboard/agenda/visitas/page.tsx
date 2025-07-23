'use client';

import React, { useState } from 'react';
import { Box, Container, Typography } from '@mui/material';

import { 
  AgendaVisitas, 
  CreateVisitDialog, 
  ViewVisitDialog 
} from '@/components/organisms/AgendaVisitas';
import { VisitAppointment, VisitStatus, VisitResult } from '@/lib/types/visit-appointment';
import { useTenant } from '@/lib/hooks/useTenant';

export default function VisitasPage() {
  const { tenantId } = useTenant();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitAppointment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateVisit = () => {
    setCreateDialogOpen(true);
  };

  const handleEditVisit = (visit: VisitAppointment) => {
    setSelectedVisit(visit);
    setEditDialogOpen(true);
  };

  const handleViewVisit = (visit: VisitAppointment) => {
    setSelectedVisit(visit);
    setViewDialogOpen(true);
  };

  const handleSaveVisit = async (visitData: Partial<VisitAppointment>) => {
    try {
      const method = visitData.id ? 'PUT' : 'POST';
      const url = visitData.id 
        ? `/api/visits/${visitData.id}?tenantId=${tenantId}`
        : `/api/visits?tenantId=${tenantId}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitData),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar visita');
      }

      // Refresh the component
      setRefreshTrigger(prev => prev + 1);
      
      // Close dialogs
      setCreateDialogOpen(false);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar visita:', error);
      alert('Erro ao salvar visita. Tente novamente.');
    }
  };

  const handleUpdateStatus = async (visitId: string, status: VisitStatus) => {
    try {
      const response = await fetch(`/api/visits/${visitId}/status?tenantId=${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status');
      }

      // Refresh the component
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };

  const handleCompleteVisit = async (visitId: string, result: VisitResult) => {
    try {
      const response = await fetch(`/api/visits/${visitId}/complete?tenantId=${tenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result }),
      });

      if (!response.ok) {
        throw new Error('Erro ao completar visita');
      }

      // Refresh the component
      setRefreshTrigger(prev => prev + 1);
      setViewDialogOpen(false);
    } catch (error) {
      console.error('Erro ao completar visita:', error);
      alert('Erro ao completar visita. Tente novamente.');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <AgendaVisitas
        key={refreshTrigger} // Force refresh
        onCreateVisit={handleCreateVisit}
        onEditVisit={handleEditVisit}
        onViewVisit={handleViewVisit}
      />

      {/* Create/Edit Visit Dialog */}
      <CreateVisitDialog
        open={createDialogOpen || editDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          setSelectedVisit(null);
        }}
        onSave={handleSaveVisit}
        editingVisit={editDialogOpen ? selectedVisit : null}
      />

      {/* View Visit Dialog */}
      <ViewVisitDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedVisit(null);
        }}
        visit={selectedVisit}
        onEdit={handleEditVisit}
        onUpdateStatus={handleUpdateStatus}
        onCompleteVisit={handleCompleteVisit}
      />
    </Container>
  );
}