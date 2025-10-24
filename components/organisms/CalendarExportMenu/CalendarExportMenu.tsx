'use client';

import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  FileDownload,
  CalendarMonth,
  TableChart,
  Code,
  ContentCopy,
  Print,
  Share,
} from '@mui/icons-material';
import { Property } from '@/lib/types/property';
import { AvailabilityCalendarDay } from '@/lib/types/availability';
import {
  exportToICal,
  exportToCSV,
  exportToJSON,
  copyToClipboard,
  printCalendar,
  generateShareableLink,
} from '@/lib/utils/calendar-export';
import { useTenant } from '@/contexts/TenantContext';

interface CalendarExportMenuProps {
  property: Property;
  propertyName: string;
  calendarDays: AvailabilityCalendarDay[];
}

export default function CalendarExportMenu({
  property,
  propertyName,
  calendarDays,
}: CalendarExportMenuProps) {
  const { tenantId } = useTenant();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const showSuccess = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
    handleClose();
  };

  const handleExportICal = () => {
    exportToICal(property, calendarDays, propertyName);
    showSuccess('Calendário exportado para iCal (.ics)');
  };

  const handleExportCSV = () => {
    exportToCSV(property, calendarDays, propertyName);
    showSuccess('Calendário exportado para CSV');
  };

  const handleExportJSON = () => {
    exportToJSON(property, calendarDays, propertyName);
    showSuccess('Calendário exportado para JSON');
  };

  const handleCopyToClipboard = async () => {
    try {
      await copyToClipboard(property, calendarDays, propertyName);
      showSuccess('Calendário copiado para área de transferência');
    } catch (error) {
      showSuccess('Erro ao copiar para área de transferência');
    }
  };

  const handlePrint = () => {
    printCalendar(property, calendarDays, propertyName);
    handleClose();
  };

  const handleShare = async () => {
    if (tenantId) {
      const link = generateShareableLink(property.id, tenantId);
      try {
        await navigator.clipboard.writeText(link);
        showSuccess('Link compartilhável copiado!');
      } catch (error) {
        showSuccess('Link: ' + link);
      }
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownload />}
        onClick={handleClick}
        size="small"
      >
        Exportar
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportICal}>
          <ListItemIcon>
            <CalendarMonth fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Exportar iCal"
            secondary="Google Calendar, Outlook"
          />
        </MenuItem>

        <MenuItem onClick={handleExportCSV}>
          <ListItemIcon>
            <TableChart fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Exportar CSV" secondary="Excel, Planilhas" />
        </MenuItem>

        <MenuItem onClick={handleExportJSON}>
          <ListItemIcon>
            <Code fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Exportar JSON" secondary="Integrações, API" />
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleCopyToClipboard}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copiar Resumo" secondary="Área de transferência" />
        </MenuItem>

        <MenuItem onClick={handlePrint}>
          <ListItemIcon>
            <Print fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Imprimir" secondary="Versão para impressão" />
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleShare}>
          <ListItemIcon>
            <Share fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Compartilhar Link" secondary="Link público" />
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
