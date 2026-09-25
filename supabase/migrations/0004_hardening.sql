-- تثبيت search_path للدوال المساعدة
alter function public._norm_phone(text) set search_path = public;
alter function public._member_private_norm() set search_path = public;
