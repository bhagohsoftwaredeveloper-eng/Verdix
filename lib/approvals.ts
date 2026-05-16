import { db } from './db';
import { v4 as uuidv4 } from 'uuid';
import { ApprovalStatus, ApprovalAction } from '@prisma/client';

export async function checkApprovalRequired(txType: string): Promise<boolean> {
  try {
    // 1. Check if the master switch is ON in pos_settings
    const settings = await db.posSettings.findFirst();
    
    let isMasterSwitchOn = true;
    if (settings) {
      switch (txType) {
        case 'STOCK_ADJUSTMENT':
          isMasterSwitchOn = !!settings.requireAdjustmentConfirmation;
          break;
        case 'STOCK_TRANSFER':
          isMasterSwitchOn = !!settings.requireTransferConfirmation;
          break;
        case 'PURCHASE_ORDER':
          isMasterSwitchOn = !!settings.requirePurchaseOrderConfirmation;
          break;
        case 'RECEIVE_PO':
          isMasterSwitchOn = !!settings.requireReceiveConfirmation;
          break;
        case 'BAD_ORDER':
          isMasterSwitchOn = !!settings.requireBadOrderConfirmation;
          break;
        case 'STOCK_COUNT':
          isMasterSwitchOn = !!settings.requireStockCountApproval;
          break;
        case 'REPACKAGING':
        case 'SHELF_TRANSFER':
          // These are not in the schema currently, default to false
          return false; 
      }
    }

    if (!isMasterSwitchOn) {
      // Master switch is OFF, skip multi-level approval
      return false;
    }

    // 2. Check if a workflow is defined
    const workflows = await db.approvalWorkflow.findMany({
      where: { transactionType: txType }
    });
    return workflows.length > 0;
  } catch (error) {
    console.error('Error checking approval requirement:', error);
    return false;
  }
}

export async function submitToApprovalQueue(txType: string, txData: any, userId: string): Promise<{ queueId: string | null; pendingApproval: boolean }> {
  try {
    const queueId = uuidv4();
    
    // 1. Get creator's role UUID
    const user = await db.user.findUnique({
      where: { uid: userId }
    });
    
    let creatorRoleId: string | undefined;
    if (user && user.userType) {
      const userType = await db.userType.findFirst({
        where: {
          OR: [
            { id: user.userType },
            { name: user.userType }
          ]
        }
      });
      creatorRoleId = userType?.id;
    }

    // 2. Get workflow steps
    const steps = await db.approvalWorkflow.findMany({
      where: { transactionType: txType },
      orderBy: { stepOrder: 'asc' }
    });

    if (!steps || steps.length === 0) {
      return { queueId: null, pendingApproval: false };
    }

    let currentStep = 1;
    let skippedSteps: typeof steps = [];

    // 3. Determine how many steps to skip (Auto-approval for creator)
    for (const step of steps) {
      if (step.userTypeId === creatorRoleId) {
        skippedSteps.push(step);
        currentStep = step.stepOrder + 1;
      } else {
        // Stop at first step that creator CANNOT approve
        break;
      }
    }

    // 4. If all steps are skipped, execute immediately
    if (currentStep > steps.length) {
      return { queueId: null, pendingApproval: false };
    }

    // 5. Insert into queue starting at the correct next step
    await db.approvalQueue.create({
      data: {
        id: queueId,
        transactionType: txType,
        transactionData: txData,
        createdById: userId,
        status: ApprovalStatus.Pending,
        currentStep: currentStep
      }
    });

    // 6. Record history for skipped steps
    if (skippedSteps.length > 0) {
      await db.approvalHistory.createMany({
        data: skippedSteps.map(step => ({
          id: uuidv4(),
          approvalQueueId: queueId,
          userId: userId,
          action: ApprovalAction.Approve,
          notes: 'Auto-approved by initiator',
          stepNumber: step.stepOrder
        }))
      });
    }

    return { queueId, pendingApproval: true };
  } catch (error) {
    console.error('Error submitting to approval queue:', error);
    throw error;
  }
}

export async function getApprovalWorkflow(txType: string) {
  const steps = await db.approvalWorkflow.findMany({
    where: { transactionType: txType },
    orderBy: { stepOrder: 'asc' }
  });
  
  const userTypeIds = steps.map(s => s.userTypeId);
  const userTypes = await db.userType.findMany({
    where: { id: { in: userTypeIds } }
  });
  const userTypeMap = new Map(userTypes.map(ut => [ut.id, ut.name]));

  return steps.map(s => ({
    ...s,
    roleName: userTypeMap.get(s.userTypeId) || null
  }));
}
