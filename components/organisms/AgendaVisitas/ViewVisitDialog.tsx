'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  IconButton,
  Card,
  CardContent,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person,
  Home,
  CalendarToday,
  AccessTime,
  Phone,
  Notes,
  LocationOn,
  Edit,
  Check,
  Cancel,
  Star,
  ThumbUp,
  ThumbDown,
  Schedule,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  VisitAppointment, 
  VisitStatus, 
  VisitResult,
  VISIT_STATUS_LABELS, 
  VISIT_STATUS_COLORS 
} from '@/lib/types/visit-appointment';

interface ViewVisitDialogProps {
  open: boolean;
  onClose: () => void;
  visit: VisitAppointment | null;
  onEdit?: (visit: VisitAppointment) => void;
  onUpdateStatus?: (visitId: string, status: VisitStatus) => Promise<void>;
  onCompleteVisit?: (visitId: string, result: VisitResult) => Promise<void>;
}

export default function ViewVisitDialog({ 
  open, 
  onClose, 
  visit, 
  onEdit,
  onUpdateStatus,
  onCompleteVisit 
}: ViewVisitDialogProps) {
  const [completingVisit, setCompletingVisit] = useState(false);
  const [visitResult, setVisitResult] = useState<Partial<VisitResult>>({
    clientLiked: false,
    clientInterested: false,
    followUpNeeded: false,
    wantsToReserve: false,
    nextAction: 'needs_follow_up',
    positiveAspects: [],
    concerns: [],
    additionalRequests: [],
    agentNotes: '',
    completedAt: new Date(),
  });

  if (!visit) return null;

  const isCompleted = visit.status === VisitStatus.COMPLETED;
  const canComplete = visit.status === VisitStatus.IN_PROGRESS || visit.status === VisitStatus.CONFIRMED;

  const handleStatusUpdate = async (newStatus: VisitStatus) => {
    if (onUpdateStatus) {
      await onUpdateStatus(visit.id, newStatus);
    }
  };

  const handleCompleteVisit = async () => {
    if (onCompleteVisit && visitResult) {
      const result: VisitResult = {
        clientLiked: visitResult.clientLiked || false,
        clientInterested: visitResult.clientInterested || false,
        followUpNeeded: visitResult.followUpNeeded || false,
        wantsToReserve: visitResult.wantsToReserve || false,
        nextAction: visitResult.nextAction || 'needs_follow_up',
        positiveAspects: visitResult.positiveAspects || [],
        concerns: visitResult.concerns || [],
        additionalRequests: visitResult.additionalRequests || [],
        agentNotes: visitResult.agentNotes || '',
        completedAt: new Date(),
      };
      
      await onCompleteVisit(visit.id, result);
      setCompletingVisit(false);
    }
  };

  const getStatusIcon = () => {
    switch (visit.status) {
      case VisitStatus.CONFIRMED:
        return <Check sx={{ color: 'success.main' }} />;
      case VisitStatus.COMPLETED:
        return <Star sx={{ color: 'warning.main' }} />;
      case VisitStatus.IN_PROGRESS:
        return <Schedule sx={{ color: 'info.main' }} />;
      case VisitStatus.CANCELLED_BY_CLIENT:
      case VisitStatus.CANCELLED_BY_AGENT:
        return <Cancel sx={{ color: 'error.main' }} />;
      default:
        return <CalendarToday sx={{ color: 'text.secondary' }} />;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getStatusIcon()}
          <Typography variant="h6">
            Detalhes da Visita
          </Typography>
          <Chip
            label={VISIT_STATUS_LABELS[visit.status]}
            size="small"
            sx={{
              backgroundColor: VISIT_STATUS_COLORS[visit.status],
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Box>
        <Box>
          {onEdit && (
            <IconButton onClick={() => onEdit(visit)} sx={{ mr: 1 }}>
              <Edit />
            </IconButton>
          )}
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Informações do Cliente */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Person />
                  Cliente
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Nome</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {visit.clientName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Telefone</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone sx={{ fontSize: 16 }} />
                      {visit.clientPhone}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Informações da Propriedade */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Home />
                  Propriedade
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Nome</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {visit.propertyName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Endereço</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn sx={{ fontSize: 16 }} />
                      {visit.propertyAddress}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Informações do Agendamento */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CalendarToday />
                  Agendamento
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Data</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {format(new Date(visit.scheduledDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Horário</Typography>
                    <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'medium' }}>
                      <AccessTime sx={{ fontSize: 16 }} />
                      {visit.scheduledTime.substring(0, 5)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Duração</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {visit.duration} minutos
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Observações */}
          {visit.notes && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Notes />
                    Observações
                  </Typography>
                  <Typography variant="body1">
                    {visit.notes}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Solicitações do Cliente */}
          {visit.clientRequests && visit.clientRequests.length > 0 && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Solicitações Específicas
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {visit.clientRequests.map((request, index) => (
                      <Chip key={index} label={request} variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Agente Responsável */}
          {visit.agentName && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Agente Responsável
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Nome</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {visit.agentName}
                      </Typography>
                    </Grid>
                    {visit.agentPhone && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Telefone</Typography>
                        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone sx={{ fontSize: 16 }} />
                          {visit.agentPhone}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Resultado da Visita (se concluída) */}
          {isCompleted && visit.visitResult && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Resultado da Visita
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {visit.visitResult.clientLiked ? (
                          <ThumbUp sx={{ color: 'success.main' }} />
                        ) : (
                          <ThumbDown sx={{ color: 'error.main' }} />
                        )}
                        <Typography variant="body2">
                          Cliente {visit.visitResult.clientLiked ? 'gostou' : 'não gostou'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Interessado</Typography>
                      <Typography variant="body1">
                        {visit.visitResult.clientInterested ? 'Sim' : 'Não'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Quer reservar</Typography>
                      <Typography variant="body1">
                        {visit.visitResult.wantsToReserve ? 'Sim' : 'Não'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="body2" color="text.secondary">Próxima ação</Typography>
                      <Typography variant="body1">
                        {visit.visitResult.nextAction}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {visit.visitResult.agentNotes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">Observações do Agente</Typography>
                      <Typography variant="body1">
                        {visit.visitResult.agentNotes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Form para completar visita */}
          {completingVisit && canComplete && (
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ border: '2px solid', borderColor: 'primary.main' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Completar Visita
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={visitResult.clientLiked}
                              onChange={(e) => setVisitResult(prev => ({ ...prev, clientLiked: e.target.checked }))}
                            />
                          }
                          label="Cliente gostou da propriedade"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={visitResult.clientInterested}
                              onChange={(e) => setVisitResult(prev => ({ ...prev, clientInterested: e.target.checked }))}
                            />
                          }
                          label="Cliente demonstrou interesse"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={visitResult.wantsToReserve}
                              onChange={(e) => setVisitResult(prev => ({ ...prev, wantsToReserve: e.target.checked }))}
                            />
                          }
                          label="Cliente quer fazer reserva"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={visitResult.followUpNeeded}
                              onChange={(e) => setVisitResult(prev => ({ ...prev, followUpNeeded: e.target.checked }))}
                            />
                          }
                          label="Necessário acompanhamento"
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Próxima ação</InputLabel>
                        <Select
                          value={visitResult.nextAction}
                          onChange={(e) => setVisitResult(prev => ({ ...prev, nextAction: e.target.value as any }))}
                        >
                          <MenuItem value="send_proposal">Enviar proposta</MenuItem>
                          <MenuItem value="schedule_another_visit">Agendar nova visita</MenuItem>
                          <MenuItem value="needs_follow_up">Fazer acompanhamento</MenuItem>
                          <MenuItem value="no_interest">Sem interesse</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        label="Observações da visita"
                        value={visitResult.agentNotes}
                        onChange={(e) => setVisitResult(prev => ({ ...prev, agentNotes: e.target.value }))}
                        multiline
                        rows={3}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>
          Fechar
        </Button>
        
        {!isCompleted && !completingVisit && (
          <>
            {visit.status === VisitStatus.SCHEDULED && (
              <Button
                onClick={() => handleStatusUpdate(VisitStatus.CONFIRMED)}
                variant="outlined"
                color="success"
              >
                Confirmar
              </Button>
            )}
            
            {visit.status === VisitStatus.CONFIRMED && (
              <Button
                onClick={() => handleStatusUpdate(VisitStatus.IN_PROGRESS)}
                variant="outlined"
                color="info"
              >
                Iniciar Visita
              </Button>
            )}
            
            {canComplete && (
              <Button
                onClick={() => setCompletingVisit(true)}
                variant="contained"
                color="primary"
              >
                Completar Visita
              </Button>
            )}
          </>
        )}
        
        {completingVisit && (
          <>
            <Button onClick={() => setCompletingVisit(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteVisit}
              variant="contained"
              color="success"
            >
              Finalizar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}