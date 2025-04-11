import { Request, Response } from 'express';
import { Asset } from '../models/assetSchema';

interface AuthRequest extends Request {
  userId?: string;
}

// Get all assets for current user
export const getAllAssets = async (req: AuthRequest, res: Response) => {
  try {
    const assets = await Asset.find({ userId: req.userId });
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assets', error });
  }
};

// Get static assets for current user
export const getStaticAssets = async (req: AuthRequest, res: Response) => {
  try {
    const assets = await Asset.find({ userId: req.userId, source: 'static' });
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching static assets', error });
  }
};

// Get detected assets for current user
export const getDetectedAssets = async (req: AuthRequest, res: Response) => {
  try {
    const assets = await Asset.find({ userId: req.userId, source: 'detected' });
    res.status(200).json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching detected assets', error });
  }
};

// Add missing asset
export const addMissingAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Validate that required fields exist
    if (!req.body.name || !req.body.type) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }
    
    const newAsset = new Asset({
      ...req.body,
      userId: req.userId,
      source: 'detected'
    });
    
    const savedAsset = await newAsset.save();
    res.status(201).json(savedAsset);
  } catch (error) {
    console.error('Error adding asset:', error);
    res.status(500).json({ 
      message: 'Error adding asset', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
};

// Initialize static assets from predefined list for current user
export const initializeStaticAssets = async (req: AuthRequest, res: Response) => {
  try {
    // First clear existing static assets for this user
    await Asset.deleteMany({ userId: req.userId, source: 'static' });
    
    // Define static assets
    const staticAssets = [
      { name: 'HDFC Savings', type: 'bank_account', source: 'static', userId: req.userId },
      { name: 'ICICI Current', type: 'bank_account', source: 'static', userId: req.userId },
      { name: 'LIC Term Plan', type: 'insurance', source: 'static', userId: req.userId },
      { name: 'Star Health Policy', type: 'insurance', source: 'static', userId: req.userId }
    ];
    
    // Insert static assets
    const result = await Asset.insertMany(staticAssets);
    res.status(201).json({ message: 'Static assets initialized', assets: result });
  } catch (error) {
    res.status(500).json({ message: 'Error initializing static assets', error });
  }
};