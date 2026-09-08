import {
  Settings,
  ISettings,
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_BROKERAGE_CONFIG,
  INotificationPref,
} from '../../models/Settings.js'
import { IUser } from '../../models/User.js'
import { UpdateBrokerageConfigPayload } from './settings.types.js'

export const getUserSettings = async (user: IUser): Promise<ISettings> => {
  let settings = await Settings.findOne({
    brokerageId: user.brokerageId,
    userId: user._id,
    scope: 'user',
  })

  if (!settings) {
    // Create default user-scoped settings
    settings = await Settings.create({
      brokerageId: user.brokerageId,
      userId: user._id,
      scope: 'user',
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
      createdBy: user._id,
    })
  }

  return settings
}

export const updateUserNotificationPrefs = async (
  notificationPrefs: INotificationPref[],
  user: IUser
): Promise<ISettings> => {
  const settings = await Settings.findOneAndUpdate(
    {
      brokerageId: user.brokerageId,
      userId: user._id,
      scope: 'user',
    },
    {
      brokerageId: user.brokerageId,
      userId: user._id,
      scope: 'user',
      notificationPrefs,
      updatedBy: user._id,
      createdBy: user._id,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  )

  return settings
}

export const getBrokerageSettings = async (user: IUser): Promise<ISettings> => {
  let settings = await Settings.findOne({
    brokerageId: user.brokerageId,
    scope: 'brokerage',
  })

  if (!settings) {
    // Create default brokerage-scoped settings
    settings = await Settings.create({
      brokerageId: user.brokerageId,
      scope: 'brokerage',
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
      brokerageConfig: DEFAULT_BROKERAGE_CONFIG,
      createdBy: user._id,
    })
  }

  return settings
}

export const updateBrokerageConfig = async (
  payload: UpdateBrokerageConfigPayload,
  user: IUser
): Promise<ISettings> => {
  const existingSettings = await getBrokerageSettings(user)
  const currentConfig = existingSettings.brokerageConfig || DEFAULT_BROKERAGE_CONFIG

  const updatedConfig = {
    ...currentConfig,
    ...payload,
  }

  existingSettings.brokerageConfig = updatedConfig
  existingSettings.updatedBy = user._id
  await existingSettings.save()

  return existingSettings
}
