import React, { useState, Dispatch, SetStateAction } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Button } from '@mui/material'
import { Loader } from 'lucide-react'
import { getSessionId } from '@/lib/store';

interface Props {
  setPurgeAlertOpen: Dispatch<SetStateAction<boolean>>
  purgeAlertOpen: boolean
  onPurgeComplete: () => void
}

async function purgeHistory(sessionId: string) {
  await fetch(`/api/history/${sessionId}`, {
    method: 'DELETE'
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          return Promise.resolve(null)
        }
        throw new Error()
      }
      return response.json()
    })
    .catch(error => {
      throw new Error(`Error during deletion: ${error}`);
    })
}

const PurgeHistory = ({ setPurgeAlertOpen, purgeAlertOpen, onPurgeComplete }: Props) => {
  const [isPurging, setIsPurging] = useState(false)

  const handleProceedPurgeHistory = async () => {
    const sessionId = getSessionId()

    if (!sessionId) {
      throw new Error('No Session ID currently defined!')
    }
    
    try {
      setIsPurging(true)
      await purgeHistory(sessionId)
      onPurgeComplete()
    } catch (error) {
      throw new Error(`${error}`)
    } finally {
      setIsPurging(false)
    }
  }

  return (
    <Dialog
      open={purgeAlertOpen}
      onClose={() => setPurgeAlertOpen(true)}
    >
      <div className='bg-slate-800 text-white'>
        <DialogTitle className='font-bold text-center'>
          Are you sure?
        </DialogTitle>
        <DialogContent >
          <DialogContentText className='text-white'>
            This will erase the chat&apos;s history from the server forever!
          </DialogContentText>
        </DialogContent>
        <DialogActions className='flex justify-center'>
          <Button variant="contained" color="error" onClick={() => setPurgeAlertOpen(false)}>Cancel</Button>
          {isPurging ?
            <Button variant="contained" disabled style={{ backgroundColor: '#2e7d32', color: 'white' }} >
              <Loader size={25} className='animate-spin' />
            </Button>
            :
            <Button variant="contained" color="success" onClick={handleProceedPurgeHistory}>Proceed</Button>
          }
        </DialogActions>
      </div>
    </Dialog>
  )
}

export default PurgeHistory
