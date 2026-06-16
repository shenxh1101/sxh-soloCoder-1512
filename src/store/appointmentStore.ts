import { create } from 'zustand';
import type { Appointment, AppointmentStatus } from '@/types';
import { getFromStorage, setToStorage, generateId, normalizePlateNumber, formatDate } from '@/utils';
import { useQueueStore } from './queueStore';
import { useMemberStore } from './memberStore';

interface AppointmentState {
  appointments: Appointment[];
  addAppointment: (data: {
    plateNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    ownerName?: string;
    phone?: string;
    note?: string;
  }) => { success: boolean; message: string; appointment?: Appointment };
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;
  deleteAppointment: (id: string) => void;
  markAsArrived: (id: string) => { success: boolean; message: string; queueItemId?: string };
  getAppointmentsByDate: (date: string) => Appointment[];
  getPendingAppointments: () => Appointment[];
  getTodayAppointments: () => Appointment[];
}

const defaultAppointments: Appointment[] = [];

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: getFromStorage<Appointment[]>('carwash_appointments', defaultAppointments),

  addAppointment: (data) => {
    const plateNumber = normalizePlateNumber(data.plateNumber);
    if (!plateNumber) {
      return { success: false, message: '请输入车牌号' };
    }
    if (!data.appointmentDate || !data.appointmentTime) {
      return { success: false, message: '请选择预约日期和时间' };
    }

    const findMemberByPlate = useMemberStore.getState().findMemberByPlate;
    const member = findMemberByPlate(plateNumber);

    const appointment: Appointment = {
      id: generateId(),
      plateNumber,
      memberId: member?.id,
      ownerName: data.ownerName || member?.ownerName,
      phone: data.phone || member?.phone,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      status: 'pending',
      note: data.note,
      createdAt: new Date().toISOString()
    };

    const appointments = [...get().appointments, appointment];
    set({ appointments });
    setToStorage('carwash_appointments', appointments);

    return {
      success: true,
      message: `预约成功！${plateNumber} ${data.appointmentDate} ${data.appointmentTime}`,
      appointment
    };
  },

  updateAppointment: (id, data) => {
    const appointments = get().appointments.map(a =>
      a.id === id ? { ...a, ...data } : a
    );
    set({ appointments });
    setToStorage('carwash_appointments', appointments);
  },

  cancelAppointment: (id) => {
    get().updateAppointment(id, { status: 'cancelled' });
  },

  deleteAppointment: (id) => {
    const appointments = get().appointments.filter(a => a.id !== id);
    set({ appointments });
    setToStorage('carwash_appointments', appointments);
  },

  markAsArrived: (id) => {
    const appointment = get().appointments.find(a => a.id === id);
    if (!appointment) {
      return { success: false, message: '预约不存在' };
    }
    if (appointment.status !== 'pending') {
      return { success: false, message: '该预约已处理' };
    }

    const queueStore = useQueueStore.getState();
    const plateNumber = appointment.plateNumber;

    const existingInQueue = queueStore.queue.find(
      q => q.plateNumber === plateNumber && q.status !== 'completed'
    );
    if (existingInQueue) {
      return { success: false, message: '该车辆已在排队中' };
    }

    const newNumber = queueStore.currentQueueNumber + 1;
    const findMemberByPlate = useMemberStore.getState().findMemberByPlate;
    const member = findMemberByPlate(plateNumber);

    const queueItem = {
      id: generateId(),
      plateNumber,
      memberId: member?.id,
      isVip: !!member,
      status: 'waiting' as const,
      queueNumber: newNumber,
      createdAt: new Date().toISOString(),
      fromAppointment: true,
      appointmentId: id
    };

    const queue = [...queueStore.queue, queueItem];
    setToStorage('carwash_queue', queue);
    setToStorage('carwash_queue_number', newNumber);

    useQueueStore.setState({
      queue,
      currentQueueNumber: newNumber
    });

    get().updateAppointment(id, {
      status: 'arrived',
      queueId: queueItem.id
    });

    return {
      success: true,
      message: `${plateNumber} 已到店，排队号 #${newNumber.toString().padStart(2, '0')}`,
      queueItemId: queueItem.id
    };
  },

  getAppointmentsByDate: (date) => {
    return get().appointments
      .filter(a => a.appointmentDate === date)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
  },

  getPendingAppointments: () => {
    return get().appointments
      .filter(a => a.status === 'pending')
      .sort((a, b) => {
        const dateCompare = a.appointmentDate.localeCompare(b.appointmentDate);
        if (dateCompare !== 0) return dateCompare;
        return a.appointmentTime.localeCompare(b.appointmentTime);
      });
  },

  getTodayAppointments: () => {
    const today = formatDate(new Date());
    return get().getAppointmentsByDate(today);
  }
}));
