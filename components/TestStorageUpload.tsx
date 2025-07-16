'use client';

import React, { useState } from 'react';
import { Button, Box, Typography, Alert, LinearProgress } from '@mui/material';
import { storage, auth } from '@/lib/firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function TestStorageUpload() {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  const testUpload = async () => {
    setStatus('Iniciando teste...');
    setError('');
    setProgress(0);
    setDownloadUrl('');

    // Check authentication
    if (!auth.currentUser) {
      setError('Usuário não autenticado!');
      return;
    }

    // Create a test file
    const testContent = 'Hello Firebase Storage! ' + new Date().toISOString();
    const blob = new Blob([testContent], { type: 'text/plain' });
    const testFile = new File([blob], 'test-upload.txt', { type: 'text/plain' });

    try {
      setStatus('Fazendo upload...');
      
      const storageRef = ref(storage, `test/test-${Date.now()}.txt`);
      const uploadTask = uploadBytesResumable(storageRef, testFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
          setStatus(`Upload: ${progress.toFixed(2)}%`);
          console.log('Upload progress:', progress);
        },
        (error) => {
          console.error('Upload error:', error);
          setError(`Erro no upload: ${error.message} (Código: ${error.code})`);
          setStatus('Erro!');
        },
        async () => {
          setStatus('Upload concluído! Obtendo URL...');
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setDownloadUrl(url);
            setStatus('✅ Teste concluído com sucesso!');
          } catch (urlError: any) {
            setError(`Erro ao obter URL: ${urlError.message}`);
            setStatus('Erro ao obter URL!');
          }
        }
      );
    } catch (err: any) {
      setError(`Erro: ${err.message}`);
      setStatus('Erro!');
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Teste de Upload do Firebase Storage
      </Typography>
      
      <Box sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Usuário: {auth.currentUser?.email || 'Não autenticado'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Storage Bucket: {storage.app.options.storageBucket || 'Não configurado'}
        </Typography>
      </Box>

      <Button 
        variant="contained" 
        onClick={testUpload}
        disabled={!auth.currentUser}
        fullWidth
      >
        Testar Upload
      </Button>

      {status && (
        <Typography variant="body1" sx={{ mt: 2 }}>
          Status: {status}
        </Typography>
      )}

      {progress > 0 && progress < 100 && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {downloadUrl && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Upload realizado com sucesso!
          </Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
            URL: {downloadUrl}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}