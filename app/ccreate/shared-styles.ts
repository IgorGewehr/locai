export const darkFieldStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: '#1a1a1a',
    '& fieldset': {
      borderColor: '#404040',
    },
    '&:hover fieldset': {
      borderColor: '#525252',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#3b82f6',
      borderWidth: 2,
    },
  },
  '& .MuiInputLabel-root': {
    color: '#a1a1a1',
    '&.Mui-focused': {
      color: '#3b82f6',
    },
  },
  '& .MuiOutlinedInput-input': {
    color: '#ffffff',
  },
};