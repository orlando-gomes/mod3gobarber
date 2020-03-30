import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';

import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notifications';
// the next import was moved to jobs/CancellationMail
// import Mail from '../../lib/Mail';
import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
  async index(req, res) {
    // Providing pagination (limit, offset)
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: { provider_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'name', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    // check if provider_id belongs to a provider
    const user = await User.findByPk(provider_id);

    if (!user.provider) {
      return res
        .status(401)
        .json({ error: 'You can only create appointments with a provider' });
    }

    // More validations about the date
    const hourStart = startOfHour(parseISO(date));

    // Check for past dates
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not allowed' });
    }

    // Check for date availability
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    // The user must be different from the provider
    if (req.userId === provider_id) {
      return res.status(400).json({
        error: 'You cannot create an appointment with yourself',
      });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    // Notify appointment provider
    const theuser = await User.findByPk(req.userId);
    const formattedDate = format(
      hourStart,
      "'dia 'dd' de 'MMMM', às 'H:mm'h'",
      { locale: pt }
    );

    await Notification.create({
      content: `Novo agendamento de ${theuser.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res
        .status(401)
        .json({ error: "You aren't allowed to cancel this appointment" });
    }

    // Calculating 2 hours less than the current hour
    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res
        .status(401)
        .json({ error: 'You can only cancel appointments 2 hours in advance' });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    /*
    // This code was moved to jobs/cancellationmail.js
    await Mail.sendMail({
      to: `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Agendamento cancelado',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(appointment.date, "'dia 'dd' de 'MMMM', às 'H:mm'h'", {
          locale: pt,
        }),
      },
    });
    */

    Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();