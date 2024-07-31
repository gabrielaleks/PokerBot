import { useState } from 'react'
import { FolderCog } from 'lucide-react'
import Modal from './Modal'
import Tooltip from '@mui/material/Tooltip';

const FilesManager = () => {
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className='flex items-center'>
      <Tooltip title="Manage files" placement="top" arrow>
        <div>
          <FolderCog
            className='cursor-pointer'
            size={20}
            onClick={() => { setOpenModal(true) }}
          />
          {openModal && <Modal open={openModal} setOpenModal={setOpenModal} />}
        </div>
      </Tooltip>
    </div>
  )
}

export default FilesManager
