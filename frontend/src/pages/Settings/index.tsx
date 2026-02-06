import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Save, RotateCcw } from 'lucide-react';
import { Button, Loading, useToast, useConfirm } from '@/components/shared';
import { useSettingsState } from './hooks/useSettingsState';
import { GeneralSettings } from './components/GeneralSettings';
import { ApiSettings } from './components/ApiSettings';
import { ModelSettings } from './components/ModelSettings';

// Settings 组件 - 纯嵌入模式（可复用）
export const Settings: React.FC = () => {
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const {
    settings,
    isLoading,
    isSaving,
    formData,
    serviceTestStates,
    handleSave,
    handleReset,
    handleFieldChange,
    handleServiceTest,
  } = useSettingsState({ showToast: show });

  const onReset = () => {
    confirm(
      '将把大模型、图像生成和并发等所有配置恢复为环境默认值，已保存的自定义设置将丢失，确定继续吗？',
      async () => {
        await handleReset();
      },
      {
        title: '确认重置为默认配置',
        confirmText: '确定重置',
        cancelText: '取消',
        variant: 'warning',
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading message="加载设置中..." />
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      {ConfirmDialog}
      <div className="space-y-8">
        {/* API 配置 */}
        <ApiSettings
          formData={formData}
          settings={settings}
          onFieldChange={handleFieldChange}
        />

        {/* 模型配置与服务测试 */}
        <ModelSettings
          formData={formData}
          settings={settings}
          onFieldChange={handleFieldChange}
          serviceTestStates={serviceTestStates}
          onServiceTest={handleServiceTest}
        />

        {/* 通用设置 */}
        <GeneralSettings
          formData={formData}
          settings={settings}
          onFieldChange={handleFieldChange}
        />

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="secondary"
            icon={<RotateCcw size={18} />}
            onClick={onReset}
            disabled={isSaving}
          >
            重置为默认配置
          </Button>
          <Button
            variant="primary"
            icon={<Save size={18} />}
            onClick={handleSave}
            loading={isSaving}
          >
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </>
  );
};

// SettingsPage 组件 - 完整页面包装
export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white border-2 border-primary p-6 md:p-10 relative">
          <div className="space-y-8">
            {/* 顶部标题 */}
            <div className="flex items-center justify-between pb-6 border-b border-border">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  icon={<Home size={18} />}
                  onClick={() => navigate('/')}
                  className="mr-6 hover:bg-gray-100 h-10 w-10 p-0 rounded-full flex items-center justify-center border border-transparent"
                  title="返回首页"
                />
                <div>
                  <h1 className="text-3xl font-serif font-medium text-primary">系统设置</h1>
                  <p className="text-sm font-sans text-secondary mt-1">
                    配置应用的各项参数
                  </p>
                </div>
              </div>
            </div>

            <Settings />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
