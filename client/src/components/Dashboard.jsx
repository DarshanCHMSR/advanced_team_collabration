
import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const Dashboard = () => {
  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="h6" component="h2">
          Projects
        </Typography>
        {/* Placeholder for project list */}
      </Box>
    </Container>
  );
};

export default Dashboard;
